"""
동적 배치 처리기 — 여러 요청을 모아서 CLIP 추론 1번에 처리
"""
import asyncio
import io
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field

import httpx
import torch
from PIL import Image
from qdrant_client.models import PointStruct

from app.services import clip as clip_svc
from app.services import qdrant as qdrant_svc

logger = logging.getLogger("BatchQueue")

BATCH_SIZE = 64
WAIT_MS = 50
NUM_WORKERS = 3   # 단일 프로세스 내 비동기 워커 수 (멀티프로세스 아님)

_executor = ThreadPoolExecutor(max_workers=NUM_WORKERS, thread_name_prefix="clip-worker")

# 프로세스별 통계
_stats = {"total_batches": 0, "total_images": 0, "total_failed": 0}
PID = os.getpid()


@dataclass
class EmbedRequest:
    productId: str
    productImageId: str
    imageUrl: str
    goodsNo: str
    brand: str
    gender: str
    category: str
    future: asyncio.Future = field(default_factory=asyncio.Future)


def _run_clip_inference(tensors: list[torch.Tensor]) -> list[list[float]]:
    model, _ = clip_svc.get_model()
    batch = torch.stack(tensors).to(clip_svc.DEVICE)
    with torch.no_grad():
        feats = model.encode_image(batch)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.cpu().numpy().tolist()


class DynamicBatchQueue:
    def __init__(self):
        self._queue: asyncio.Queue[EmbedRequest] = asyncio.Queue()
        self._worker_ids: list[int] = []

    def start(self):
        for i in range(NUM_WORKERS):
            task = asyncio.create_task(self._worker(i))
            self._worker_ids.append(id(task))
        logger.info(f"[PID {PID}] 배치 워커 {NUM_WORKERS}개 시작")

    async def enqueue(self, req: EmbedRequest) -> dict:
        await self._queue.put(req)
        return await req.future

    async def _worker(self, worker_id: int):
        logger.info(f"[PID {PID}] Worker-{worker_id} 준비")
        while True:
            batch: list[EmbedRequest] = [await self._queue.get()]

            deadline = time.monotonic() + WAIT_MS / 1000
            while len(batch) < BATCH_SIZE:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    req = await asyncio.wait_for(self._queue.get(), timeout=remaining)
                    batch.append(req)
                except asyncio.TimeoutError:
                    break

            logger.info(f"[PID {PID}] Worker-{worker_id} 배치 처리 시작: {len(batch)}개 | 큐 대기: {self._queue.qsize()}")
            t0 = time.monotonic()

            try:
                await self._process_batch(worker_id, batch)
            except Exception as e:
                logger.error(f"[PID {PID}] Worker-{worker_id} 배치 실패: {e}")
                for req in batch:
                    if not req.future.done():
                        req.future.set_exception(e)
            finally:
                elapsed = (time.monotonic() - t0) * 1000
                logger.info(f"[PID {PID}] Worker-{worker_id} 배치 완료: {elapsed:.0f}ms")

    async def _process_batch(self, worker_id: int, batch: list[EmbedRequest]):
        # 1) 병렬 다운로드
        t0 = time.monotonic()
        async with httpx.AsyncClient() as client:
            raw_list = await asyncio.gather(
                *[_download(client, req.imageUrl) for req in batch],
                return_exceptions=True,
            )
        dl_ms = (time.monotonic() - t0) * 1000

        # 2) PIL 전처리
        _, preprocess = clip_svc.get_model()
        tensors: list[torch.Tensor] = []
        valid_idx: list[int] = []
        failed = 0

        for i, raw in enumerate(raw_list):
            if isinstance(raw, Exception) or raw is None:
                batch[i].future.set_result({"vectorId": None, "error": "download_failed"})
                failed += 1
                continue
            try:
                img = Image.open(io.BytesIO(raw)).convert("RGB")
                tensors.append(preprocess(img))
                valid_idx.append(i)
            except Exception:
                batch[i].future.set_result({"vectorId": None, "error": "decode_failed"})
                failed += 1

        if not tensors:
            logger.warning(f"[PID {PID}] Worker-{worker_id} 유효 이미지 없음 (전체 {len(batch)}개 실패)")
            return

        # 3) CLIP 추론
        t1 = time.monotonic()
        loop = asyncio.get_event_loop()
        vectors: list[list[float]] = await loop.run_in_executor(
            _executor, _run_clip_inference, tensors
        )
        clip_ms = (time.monotonic() - t1) * 1000

        # 4) Qdrant upsert
        t2 = time.monotonic()
        points = []
        for rank, idx in enumerate(valid_idx):
            req = batch[idx]
            vector_id = abs(hash(req.productImageId)) % (2 ** 63)
            points.append(PointStruct(
                id=vector_id,
                vector=vectors[rank],
                payload={
                    "productId": req.productId,
                    "productImageId": req.productImageId,
                    "goodsNo": req.goodsNo,
                    "brand": req.brand,
                    "gender": req.gender,
                    "category": req.category,
                },
            ))
        qdrant_svc.get_client().upsert(collection_name=qdrant_svc.COLLECTION, points=points)
        qdrant_ms = (time.monotonic() - t2) * 1000

        # 5) future 완료
        for rank, idx in enumerate(valid_idx):
            req = batch[idx]
            vector_id = abs(hash(req.productImageId)) % (2 ** 63)
            req.future.set_result({"vectorId": str(vector_id), "error": None})

        # 통계 업데이트
        _stats["total_batches"] += 1
        _stats["total_images"] += len(valid_idx)
        _stats["total_failed"] += failed

        logger.info(
            f"[PID {PID}] Worker-{worker_id} | "
            f"성공 {len(valid_idx)}/{len(batch)}개 | "
            f"다운로드 {dl_ms:.0f}ms | CLIP {clip_ms:.0f}ms | Qdrant {qdrant_ms:.0f}ms | "
            f"누적 {_stats['total_images']}개 처리"
        )


async def _download(client: httpx.AsyncClient, url: str) -> bytes | None:
    try:
        resp = await client.get(url, timeout=20)
        resp.raise_for_status()
        return resp.content
    except Exception:
        return None


_batch_queue: DynamicBatchQueue | None = None


def get_batch_queue() -> DynamicBatchQueue:
    global _batch_queue
    if _batch_queue is None:
        _batch_queue = DynamicBatchQueue()
    return _batch_queue
