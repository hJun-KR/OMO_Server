import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../common/auth/auth.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
