import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const QUEUE_POST_DETECTION = 'post-detection';
export const QUEUE_EMBEDDING = 'embedding';
export const QUEUE_CRAWLER = 'crawler';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_POST_DETECTION },
      { name: QUEUE_EMBEDDING },
      { name: QUEUE_CRAWLER },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
