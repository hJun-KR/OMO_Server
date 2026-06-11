from typing import Optional

import open_clip
import torch
from PIL import Image

MODEL_NAME = "ViT-L-14"
PRETRAINED = "openai"
QDRANT_DIM = 768

# M2 MPS > CUDA > CPU 순으로 자동 선택
if torch.backends.mps.is_available():
    DEVICE = torch.device("mps")
elif torch.cuda.is_available():
    DEVICE = torch.device("cuda")
else:
    DEVICE = torch.device("cpu")

_state: dict = {}


def load_model():
    model, _, preprocess = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=PRETRAINED)
    model.eval()
    model.to(DEVICE)
    _state["model"] = model
    _state["preprocess"] = preprocess
    print(f"[CLIP] 모델 로드 완료 — device: {DEVICE}")


def get_model():
    if "model" not in _state:
        load_model()
    return _state["model"], _state["preprocess"]


def embed_image(image: Image.Image) -> list[float]:
    model, preprocess = get_model()
    tensor = preprocess(image.convert("RGB")).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        feat = model.encode_image(tensor)
        feat = feat / feat.norm(dim=-1, keepdim=True)
    return feat.squeeze(0).cpu().tolist()


def embed_image_path(path: str) -> list[float]:
    image = Image.open(path).convert("RGB")
    return embed_image(image)
