from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from app.services.clip import QDRANT_DIM

COLLECTION = "fashion-products"

# 파일로 저장 — AI server 재시작해도 데이터 유지
_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(path="./qdrant_data")
        _ensure_collection(_client)
    return _client


def _ensure_collection(client: QdrantClient):
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=QDRANT_DIM, distance=Distance.COSINE),
        )


def upsert(product_id: str, product_image_id: str, goods_no: str,
           brand: str, gender: str, category: str, vector: list[float]):
    client = get_client()
    point = PointStruct(
        id=abs(hash(product_image_id)) % (2 ** 63),  # uint64
        vector=vector,
        payload={
            "productId": product_id,
            "productImageId": product_image_id,
            "goodsNo": goods_no,
            "brand": brand,
            "gender": gender,
            "category": category,
        },
    )
    client.upsert(collection_name=COLLECTION, points=[point])


def search(vector: list[float], top_k: int = 100) -> list[dict]:
    client = get_client()
    results = client.search(
        collection_name=COLLECTION,
        query_vector=vector,
        limit=top_k,
        with_payload=True,
    )
    return [
        {
            "score": hit.score,
            "productId": hit.payload.get("productId"),
            "productImageId": hit.payload.get("productImageId"),
            "goodsNo": hit.payload.get("goodsNo"),
            "brand": hit.payload.get("brand"),
            "category": hit.payload.get("category"),
        }
        for hit in results
    ]


def rerank(hits: list[dict], top_n: int = 20) -> list[dict]:
    """
    WORKFLOW 섹션 15: group by productId → highest similarity → sort desc
    """
    best: dict[str, dict] = {}
    for hit in hits:
        pid = hit["productId"]
        if pid not in best or hit["score"] > best[pid]["score"]:
            best[pid] = hit

    ranked = sorted(best.values(), key=lambda x: x["score"], reverse=True)
    return ranked[:top_n]
