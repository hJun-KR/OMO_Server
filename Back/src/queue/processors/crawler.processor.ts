import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { MusinsaCrawlerService } from '../../modules/product/services/musinsa-crawler.service';
import { QUEUE_CRAWLER } from '../bull.module';

export interface CrawlerJob {
  category: string;
  nextUrl: string;
  collectedCount: number;
}

@Processor(QUEUE_CRAWLER)
export class CrawlerProcessor {
  private readonly logger = new Logger(CrawlerProcessor.name);

  constructor(
    private readonly crawler: MusinsaCrawlerService,
    @InjectQueue(QUEUE_CRAWLER)
    private readonly crawlerQueue: Queue<CrawlerJob>,
  ) {}

  @Process()
  async handle(job: Job<CrawlerJob>) {
    const { category, nextUrl, collectedCount } = job.data;

    const result = await this.crawler.crawlPage(category, nextUrl, collectedCount);

    if (result.nextUrl) {
      await this.crawlerQueue.add(
        { category, nextUrl: result.nextUrl, collectedCount: result.totalCollected },
        { attempts: 3, backoff: { type: 'fixed', delay: 1000 } },
      );
    } else {
      this.logger.log(`완료: category=${category} 총 ${result.totalCollected}개 수집`);
    }
  }
}
