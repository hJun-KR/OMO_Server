import { Controller, Get, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/auth/guards/roles.guard';
import { MusinsaCrawlerService } from './services/musinsa-crawler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_EMBEDDING } from '../../queue/bull.module';
import type { EmbeddingJob } from '../../queue/processors/embedding.processor';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly crawler: MusinsaCrawlerService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_EMBEDDING)
    private readonly embeddingQueue: Queue<EmbeddingJob>,
  ) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
      },
    });
  }

  @Post('crawl/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  startCrawl() {
    return this.crawler.enqueueCrawl();
  }

  @Post('embedding/retry')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async retryMissingEmbeddings() {
    const missing = await this.prisma.$queryRaw<{
      id: string;
      productId: string;
      imageUrl: string;
      externalId: string;
      brand: string;
      gender: string;
      category: string;
    }[]>`
      SELECT pi.id, pi."productId", pi."imageUrl",
             p."externalId", p.brand, p.gender, p.category
      FROM "ProductImage" pi
      JOIN "Product" p ON p.id = pi."productId"
      WHERE NOT EXISTS (
        SELECT 1 FROM "ProductEmbedding" pe WHERE pe."productImageId" = pi.id
      )
    `;

    this.logger.log(`누락 임베딩 ${missing.length}개 재등록 시작`);

    let enqueued = 0;
    for (const item of missing) {
      await this.embeddingQueue.add(
        {
          productId: item.productId,
          productImageId: item.id,
          imageUrl: item.imageUrl,
          goodsNo: item.externalId,
          brand: item.brand,
          gender: item.gender ?? 'A',
          category: item.category,
        },
        {
          attempts: 999,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 500,
          removeOnFail: false,
        },
      );
      enqueued++;
    }

    return { enqueued, total: missing.length };
  }
}
