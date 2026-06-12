import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../common/auth/auth.module';
import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FollowController],
  providers: [FollowService],
})
export class FollowModule {}
