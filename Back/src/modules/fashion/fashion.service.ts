import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';

import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from './ai.service';

@Injectable()
export class FashionService {
  private readonly logger = new Logger(FashionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async search(file: Express.Multer.File) {
    const filePath = path.join(process.cwd(), 'uploads', file.filename);

    const aiResult = await this.ai.search(filePath);

    // AI server가 반환한 productId로 DB에서 상품 상세 조회
    const items = await Promise.all(
      aiResult.items.map(async (item) => {
        const productIds = [
          ...new Set(item.products.map((p) => p.productId).filter(Boolean)),
        ];

        const products = await this.prisma.product.findMany({
          where: { id: { in: productIds }, isDeleted: false },
          select: {
            id: true,
            name: true,
            brand: true,
            brandName: true,
            thumbnailUrl: true,
            productUrl: true,
            price: true,
            category: true,
          },
        });

        // score 순서 유지
        const scoreMap = new Map(
          item.products.map((p) => [p.productId, p.score]),
        );
        const sorted = products.sort(
          (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0),
        );

        return {
          category: item.category,
          croppedImagePath: item.croppedImagePath,
          products: sorted.map((p) => ({
            ...p,
            score: scoreMap.get(p.id) ?? 0,
          })),
        };
      }),
    );

    return { items };
  }
}
