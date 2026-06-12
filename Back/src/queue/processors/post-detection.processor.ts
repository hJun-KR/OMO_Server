import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_POST_DETECTION } from '../bull.module';

export interface PostDetectionJob {
  postId: string;
  filePath: string;
}

interface DetectedItem {
  category: string;
  confidence: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

@Processor(QUEUE_POST_DETECTION)
export class PostDetectionProcessor {
  private readonly logger = new Logger(PostDetectionProcessor.name);
  private readonly aiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiUrl = this.config.get<string>('AI_SERVER_URL', 'http://localhost:8000');
  }

  @Process()
  async handle(job: Job<PostDetectionJob>) {
    const { postId, filePath } = job.data;

    await this.prisma.post.update({
      where: { id: postId },
      data: { detectionStatus: 'PROCESSING' },
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FormData = require('form-data') as typeof import('form-data');
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      const response = await axios.post<{ items: DetectedItem[] }>(
        `${this.aiUrl}/detect`,
        form,
        { headers: form.getHeaders(), timeout: 60000 },
      );

      const items = response.data.items;

      if (items.length > 0) {
        await this.prisma.detectedProduct.createMany({
          data: items.map((item) => ({
            postId,
            category: item.category,
            confidence: item.confidence,
            positionX: item.positionX,
            positionY: item.positionY,
            width: item.width,
            height: item.height,
          })),
        });
      }

      await this.prisma.post.update({
        where: { id: postId },
        data: { detectionStatus: 'COMPLETED' },
      });

      this.logger.log(`감지 완료: postId=${postId}, items=${items.length}`);
    } catch (err) {
      this.logger.error(`감지 실패: postId=${postId}`, String(err));
      await this.prisma.post.update({
        where: { id: postId },
        data: { detectionStatus: 'FAILED' },
      });
    }
  }
}
