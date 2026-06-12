import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { QueueModule } from '../../queue/bull.module';
import { PostDetectionProcessor } from '../../queue/processors/post-detection.processor';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [PostController],
  providers: [PostService, PostDetectionProcessor],
})
export class PostModule {}
