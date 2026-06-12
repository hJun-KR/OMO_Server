export interface AiProductHit {
  productId: string;
  productImageId: string;
  brand: string;
  category: string;
  score: number;
}

export interface AiSearchItem {
  category: string;
  croppedImagePath: string;
  products: AiProductHit[];
}

export interface AiSearchResponse {
  items: AiSearchItem[];
}
