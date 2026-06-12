import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { FollowService } from './follow.service';

interface AuthenticatedRequest extends Request {
  user: { id: string; loginId: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(':id/follow')
  follow(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    return this.followService.follow(req.user.id, targetId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  unfollow(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    return this.followService.unfollow(req.user.id, targetId);
  }

  @Get(':id/followers')
  getFollowers(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.followService.getFollowers(userId, req.user.id, cursor, limit);
  }

  @Get(':id/followings')
  getFollowings(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.followService.getFollowings(userId, req.user.id, cursor, limit);
  }

  @Get(':id/follow-status')
  getFollowStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    return this.followService.getFollowStatus(req.user.id, targetId);
  }
}
