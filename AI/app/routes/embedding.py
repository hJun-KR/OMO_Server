import asyncio
import io
import uuid
from pathlib import Path

import httpx
import torch
from PIL import Image
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from qdrant_client.models import PointStruct

from app.services import clip as clip_svc
from app.services import qdrant as qdrant_svc

router = APIRouter()

UPLOAD_DIR = Path("uploads")


class EmbedResponse(BaseModel):
    vector: list[float]
    dimension: int


class UpsertRequest(BaseModel):
    productId: str
    productImageId: str
    imageUrl: str
    goodsNo: str
    brand: str
    gender: str = "A"
    category: str


class UpsertResponse(BaseModel):
    vectorId: str


@router.post("/embed", response_model=EmbedResponse)
async def embed(file: UploadFile = File(...)):
    """파일을 직접 업로드해서 벡터 반환 (테스트용)"""
    contents = await file.read()
    tmp_path = UPLOAD_DIR / f"tmp_{uuid.uuid4().hex}.jpg"
    tmp_path.write_bytes(contents)

    try:
        vector = clip_svc.embed_image_path(str(tmp_path))
        return EmbedResponse(vector=vector, dimension=len(vector))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        tmp_path.unlink(missing_ok=True)


@router.post("/embed/upsert", response_model=UpsertResponse)
async def embed_upsert(req: UpsertRequest):
    """
    단건 요청 → 동적 배치 큐로 전달 (여러 요청이 동시에 오면 자동으로 배치 처리됨)
    """
    from app.services.batch_queue import get_batch_queue, EmbedRequest

    embed_req = EmbedRequest(
        productId=req.productId,
        productImageId=req.productImageId,
        imageUrl=req.imageUrl,
        goodsNo=req.goodsNo,
        brand=req.brand,
        gender=req.gender,
        category=req.category,
    )

    try:
        result = await get_batch_queue().enqueue(embed_req)
        if not result.get("vectorId"):
            raise HTTPException(status_code=500, detail=result.get("error", "unknown"))
        return UpsertResponse(vectorId=result["vectorId"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 배치 처리 ──────────────────────────────────────────────────────────────────

class BatchUpsertItem(BaseModel):
    productId: str
    productImageId: str
    imageUrl: str
    goodsNo: str
    brand: str
    gender: str
    category: str


class BatchUpsertRequest(BaseModel):
    items: list[BatchUpsertItem]


class BatchUpsertResult(BaseModel):
    productImageId: str
    vectorId: str | None
    error: str | None = None


class BatchUpsertResponse(BaseModel):
    results: list[BatchUpsertResult]
    successCount: int
    failCount: int


async def _download(client: httpx.AsyncClient, url: str) -> bytes | None:
    try:
        resp = await client.get(url, timeout=20)
        resp.raise_for_status()
        return resp.content
    except Exception:
        return None


@router.post("/embed/batch", response_model=BatchUpsertResponse)
async def embed_batch(req: BatchUpsertRequest):
    """
    최대 32개 이미지를 병렬 다운로드 → CLIP 배치 추론 → Qdrant 일괄 upsert
    NestJS BatchEmbeddingProcessor가 호출함.
    """
    from qdrant_client.models import PointStruct

    items = req.items[:32]
    model, preprocess = clip_svc.get_model()

    # 1) 이미지 병렬 다운로드
    async with httpx.AsyncClient() as client:
        raw_list = await asyncio.gather(*[_download(client, it.imageUrl) for it in items])

    # 2) PIL 변환 + 전처리 (유효한 것만)
    tensors: list[torch.Tensor] = []
    valid_indices: list[int] = []
    results: list[BatchUpsertResult] = [
        BatchUpsertResult(productImageId=it.productImageId, vectorId=None, error="download_failed")
        for it in items
    ]

    for i, raw in enumerate(raw_list):
        if raw is None:
            continue
        try:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            tensors.append(preprocess(img))
            valid_indices.append(i)
            results[i].error = None  # 일단 초기화
        except Exception:
            results[i].error = "decode_failed"

    if tensors:
        # 3) CLIP 배치 추론 (한 번에)
        batch = torch.stack(tensors)
        with torch.no_grad():
            feats = model.encode_image(batch)
            feats = feats / feats.norm(dim=-1, keepdim=True)
        vectors = feats.cpu().numpy().tolist()

        # 4) Qdrant 일괄 upsert
        points = []
        for rank, idx in enumerate(valid_indices):
            it = items[idx]
            vector_id = abs(hash(it.productImageId)) % (2 ** 63)
            points.append(PointStruct(
                id=vector_id,
                vector=vectors[rank],
                payload={
                    "productId": it.productId,
                    "productImageId": it.productImageId,
                    "goodsNo": it.goodsNo,
                    "brand": it.brand,
                    "gender": it.gender,
                    "category": it.category,
                },
            ))
            results[idx] = BatchUpsertResult(
                productImageId=it.productImageId,
                vectorId=str(vector_id),
                error=None,
            )

        qdrant_svc.get_client().upsert(collection_name=qdrant_svc.COLLECTION, points=points)

    success = sum(1 for r in results if r.error is None)
    return BatchUpsertResponse(
        results=results,
        successCount=success,
        failCount=len(results) - success,
    )
