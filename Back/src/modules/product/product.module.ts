import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { QUEUE_CRAWLER, QUEUE_EMBEDDING } from '../../queue/bull.module';
import { CrawlerProcessor } from '../../queue/processors/crawler.processor';
import { BatchEmbeddingProcessor } from '../../queue/processors/batch-embedding.processor';
import { ProductController } from './product.controller';
import { MusinsaCrawlerService } from './services/musinsa-crawler.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      { name: QUEUE_CRAWLER },
      { name: QUEUE_EMBEDDING },
    ),
  ],
  controllers: [ProductController],
  providers: [MusinsaCrawlerService, CrawlerProcessor, BatchEmbeddingProcessor],
})
export class ProductModule {}
