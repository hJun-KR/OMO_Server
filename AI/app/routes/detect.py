import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.services import crop as crop_svc
from app.services import yolo as yolo_svc
from PIL import Image

router = APIRouter()

UPLOAD_DIR = Path("uploads")


class DetectedItem(BaseModel):
    category: str
    croppedImagePath: str
    confidence: float
    positionX: float
    positionY: float
    width: float
    height: float


class DetectResponse(BaseModel):
    items: list[DetectedItem]


@router.post("/detect", response_model=DetectResponse)
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    tmp_path = UPLOAD_DIR / f"tmp_{uuid.uuid4().hex}.jpg"
    tmp_path.write_bytes(contents)

    try:
        image = Image.open(tmp_path).convert("RGB")
        detections = yolo_svc.detect(str(tmp_path))

        items: list[DetectedItem] = []
        for det in detections:
            crop = crop_svc.crop_with_mask(image, det["mask"], det["box"])
            crop_path = crop_svc.save_crop(crop, det["category"])

            x1, y1, x2, y2 = det["box"]
            items.append(DetectedItem(
                category=det["category"],
                croppedImagePath=crop_path,
                confidence=det["confidence"],
                positionX=float(x1),
                positionY=float(y1),
                width=float(x2 - x1),
                height=float(y2 - y1),
            ))

        return DetectResponse(items=items)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        tmp_path.unlink(missing_ok=True)
