import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiService } from './ai.service';
import { FashionController } from './fashion.controller';
import { FashionService } from './fashion.service';

@Module({
  imports: [PrismaModule],
  controllers: [FashionController],
  providers: [AiService, FashionService],
})
export class FashionModule {}
