import uuid
from pathlib import Path

import numpy as np
from PIL import Image

ITEMS_DIR = Path("uploads/items")


def crop_with_mask(image: Image.Image, mask: np.ndarray, box: list) -> Image.Image:
    img_array = np.array(image.convert("RGBA"))
    img_array[:, :, 3] = (mask * 255).astype(np.uint8)
    x1, y1, x2, y2 = (int(v) for v in box)
    return Image.fromarray(img_array).crop((x1, y1, x2, y2))


def save_crop(crop: Image.Image, category: str) -> str:
    out_dir = ITEMS_DIR / category
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.png"
    crop.save(out_dir / filename)
    return f"uploads/items/{category}/{filename}"
