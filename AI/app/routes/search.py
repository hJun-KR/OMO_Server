import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from PIL import Image

from app.services import clip as clip_svc
from app.services import crop as crop_svc
from app.services import qdrant as qdrant_svc
from app.services import yolo as yolo_svc

router = APIRouter()

UPLOAD_DIR = Path("uploads")


class ProductHit(BaseModel):
    productId: str
    productImageId: str
    brand: str
    category: str
    score: float


class SearchItem(BaseModel):
    category: str
    croppedImagePath: str
    products: list[ProductHit]


class SearchResponse(BaseModel):
    items: list[SearchItem]


@router.post("/search", response_model=SearchResponse)
async def search(file: UploadFile = File(...)):
    """
    WORKFLOW 섹션 12:
    upload → YOLO detect → crop → embedding → Qdrant top100
    → group by productId → reranking → top20
    """
    contents = await file.read()
    tmp_path = UPLOAD_DIR / f"tmp_{uuid.uuid4().hex}.jpg"
    tmp_path.write_bytes(contents)

    try:
        image = Image.open(tmp_path).convert("RGB")
        detections = yolo_svc.detect(str(tmp_path))

        items: list[SearchItem] = []

        for det in detections:
            crop = crop_svc.crop_with_mask(image, det["mask"], det["box"])
            crop_path = crop_svc.save_crop(crop, det["category"])

            vector = clip_svc.embed_image(crop.convert("RGB"))
            hits = qdrant_svc.search(vector, top_k=100)
            top20 = qdrant_svc.rerank(hits, top_n=20)

            products = [
                ProductHit(
                    productId=h["productId"] or "",
                    productImageId=h["productImageId"] or "",
                    brand=h["brand"] or "",
                    category=h["category"] or "",
                    score=round(h["score"], 4),
                )
                for h in top20
                if h["productId"]
            ]

            items.append(SearchItem(
                category=det["category"],
                croppedImagePath=crop_path,
                products=products,
            ))

        return SearchResponse(items=items)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        tmp_path.unlink(missing_ok=True)
