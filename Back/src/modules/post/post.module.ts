import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DetectService } from './detect.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostController],
  providers: [PostService, DetectService],
})
export class PostModule {}
