import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_EMBEDDING } from '../bull.module';

export interface EmbeddingJob {
  productId: string;
  productImageId: string;
  imageUrl: string;
  goodsNo: string;
  brand: string;
  gender: string;
  category: string;
}

@Processor(QUEUE_EMBEDDING)
export class EmbeddingProcessor {
  private readonly logger = new Logger(EmbeddingProcessor.name);
  private readonly aiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiUrl = this.config.get<string>('AI_SERVER_URL', 'http://localhost:8000');
  }

  @Process()
  async handle(job: Job<EmbeddingJob>) {
    const { productId, productImageId, imageUrl, goodsNo, brand, gender, category } = job.data;

    try {
      // AI server에 imageUrl로 임베딩 요청
      const response = await axios.post<{ vectorId: string }>(
        `${this.aiUrl}/embed/upsert`,
        { productId, productImageId, imageUrl, goodsNo, brand, gender, category },
        { timeout: 60000 },
      );

      const vectorId = response.data.vectorId;

      // vectorId DB 저장
      await this.prisma.productEmbedding.upsert({
        where: { vectorId },
        create: {
          productId,
          productImageId,
          vectorId,
          modelName: 'ViT-L/14',
          dimension: 768,
        },
        update: {},
      });

      this.logger.log(`임베딩 완료: productImageId=${productImageId}`);
    } catch (err) {
      this.logger.error(`임베딩 실패: productImageId=${productImageId}`, String(err));
      throw err; // Bull이 재시도하도록 throw
    }
  }
}
