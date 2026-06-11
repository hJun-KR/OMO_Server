from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image
from ultralytics import YOLO

CATEGORY_MAP: dict[str, Optional[str]] = {
    "shirt, blouse": "top",
    "top, t-shirt, sweatshirt": "top",
    "sweater": "top",
    "cardigan": "top",
    "jacket": "outer",
    "coat": "outer",
    "pants": "bottom",
    "shorts": "bottom",
    "skirt": "bottom",
    "dress": "dress",
    "jumpsuit": "dress",
    "shoe": "shoes",
    "bag, wallet": "bag",
}

FASHION_CLASSES = {"top", "outer", "bottom", "dress", "shoes", "bag"}
CONFIDENCE_THRESHOLD = 0.5

_model: Optional[YOLO] = None


def load_model():
    global _model
    model_path = "fashion-seg.pt" if Path("fashion-seg.pt").exists() else "yolov8n-seg.pt"
    _model = YOLO(model_path)


def get_model() -> YOLO:
    if _model is None:
        load_model()
    return _model


def resolve_category(label: str) -> Optional[str]:
    lower = label.lower()
    if lower in CATEGORY_MAP:
        return CATEGORY_MAP[lower]
    for key, val in CATEGORY_MAP.items():
        if key in lower:
            return val
    return None


def detect(image_path: str) -> list[dict]:
    """
    Returns list of {category, box, mask_resized, confidence}
    """
    model = get_model()
    image = Image.open(image_path).convert("RGB")
    w, h = image.size
    results = model(image_path, verbose=False)

    detections = []
    seen: set[str] = set()

    for result in results:
        if result.masks is None:
            continue
        masks = result.masks.data.cpu().numpy()
        for mask_raw, box in zip(masks, result.boxes.data):
            label = result.names[int(box[5])]
            category = resolve_category(label)

            if not category or category not in FASHION_CLASSES or category in seen:
                continue
            if float(box[4]) < CONFIDENCE_THRESHOLD:
                continue
            seen.add(category)

            mask_resized = np.array(
                Image.fromarray((mask_raw * 255).astype(np.uint8)).resize(
                    (w, h), Image.NEAREST
                )
            ) / 255.0

            detections.append({
                "category": category,
                "box": box[:4].tolist(),
                "mask": mask_resized,
                "confidence": float(box[4]),
            })

    return detections
