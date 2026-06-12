import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Job, Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_EMBEDDING } from '../bull.module';
import type { EmbeddingJob } from './embedding.processor';

interface BatchResult {
  productImageId: string;
  vectorId: string | null;
  error?: string;
}

@Injectable()
@Processor(QUEUE_EMBEDDING)
export class BatchEmbeddingProcessor {
  private readonly logger = new Logger(BatchEmbeddingProcessor.name);
  private readonly aiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_EMBEDDING)
    private readonly queue: Queue<EmbeddingJob>,
  ) {
    this.aiUrl = this.config.get<string>('AI_SERVER_URL', 'http://localhost:8000');
  }

  // concurrency 20 → 20개 요청이 AI /embed/upsert에 동시에 날아감
  // AI 배치 큐가 100ms 안에 모인 요청들을 32개씩 묶어서 CLIP 배치 추론
  @Process({ concurrency: 64 })
  async handle(job: Job<EmbeddingJob>) {
    const { productId, productImageId, imageUrl, goodsNo, brand, gender, category } = job.data;

    const res = await axios.post<{ vectorId: string }>(
      `${this.aiUrl}/embed/upsert`,
      { productId, productImageId, imageUrl, goodsNo, brand, gender, category },
      { timeout: 120000 },
    );

    const result = res.data;
    if (!result?.vectorId) {
      throw new Error(`임베딩 실패`);
    }

    await this.prisma.productEmbedding.upsert({
      where: { vectorId: result.vectorId! },
      create: {
        productId,
        productImageId,
        vectorId: result.vectorId,
        modelName: 'ViT-L/14',
        dimension: 768,
      },
      update: {},
    });

    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);
    const total = waiting + active + completed + failed;
    const progress = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

    this.logger.log(
      `임베딩 완료 | 대기 ${waiting} | 처리중 ${active} | 완료 ${completed} | 실패 ${failed} | 진행률 ${progress}%`,
    );
  }
}
