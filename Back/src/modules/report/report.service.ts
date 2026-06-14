import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportTargetType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async reportPost(reporterId: string, postId: string, dto: CreateReportDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: { id: true, authorId: true },
    });
    if (!post) throw new NotFoundException('존재하지 않는 게시글입니다');
    if (post.authorId === reporterId) {
      throw new BadRequestException('자신의 게시글을 신고할 수 없습니다');
    }

    const existing = await this.prisma.report.findFirst({
      where: { reporterId, postId, targetType: ReportTargetType.POST },
    });
    if (existing) throw new ConflictException('이미 신고한 게시글입니다');

    await this.prisma.report.create({
      data: {
        reason: dto.reason,
        description: dto.description,
        targetType: ReportTargetType.POST,
        reporterId,
        postId,
      },
    });

    return { reported: true };
  }

  async reportUser(reporterId: string, targetUserId: string, dto: CreateReportDto) {
    if (reporterId === targetUserId) {
      throw new BadRequestException('자기 자신을 신고할 수 없습니다');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId, isDeleted: false },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('존재하지 않는 유저입니다');

    const existing = await this.prisma.report.findFirst({
      where: { reporterId, reportedUserId: targetUserId, targetType: ReportTargetType.USER },
    });
    if (existing) throw new ConflictException('이미 신고한 유저입니다');

    await this.prisma.report.create({
      data: {
        reason: dto.reason,
        description: dto.description,
        targetType: ReportTargetType.USER,
        reporterId,
        reportedUserId: targetUserId,
      },
    });

    return { reported: true };
  }
}
