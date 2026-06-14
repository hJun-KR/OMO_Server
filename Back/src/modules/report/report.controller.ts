import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportService } from './report.service';

interface AuthenticatedRequest extends Request {
  user: { id: string; loginId: string };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('posts/:id/report')
  reportPost(
    @Req() req: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.reportPost(req.user.id, postId, dto);
  }

  @Post('users/:id/report')
  reportUser(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.reportUser(req.user.id, targetUserId, dto);
  }
}
