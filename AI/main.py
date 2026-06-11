from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from app.routes import admin, detect, embedding, search
from app.services import clip as clip_svc
from app.services import yolo as yolo_svc
from app.services import qdrant as qdrant_svc
from app.services.batch_queue import get_batch_queue


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path("uploads").mkdir(exist_ok=True)
    Path("uploads/items").mkdir(exist_ok=True)

    yolo_svc.load_model()
    clip_svc.load_model()
    qdrant_svc.get_client()
    get_batch_queue().start()  # 동적 배치 큐 워커 시작

    yield


app = FastAPI(title="Fashion AI Server", lifespan=lifespan)

app.include_router(detect.router)
app.include_router(embedding.router)
app.include_router(search.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
