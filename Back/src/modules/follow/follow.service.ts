import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const USER_SUMMARY_SELECT = {
  id: true,
  nickname: true,
  profileImage: true,
  bio: true,
} as const;

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('자기 자신을 팔로우할 수 없습니다');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: followingId, isDeleted: false },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('존재하지 않는 유저입니다');

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) throw new ConflictException('이미 팔로우 중입니다');

    await this.prisma.follow.create({ data: { followerId, followingId } });
    return { following: true };
  }

  async unfollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('자기 자신을 언팔로우할 수 없습니다');
    }

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing) throw new NotFoundException('팔로우 관계가 없습니다');

    await this.prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { following: false };
  }

  async getFollowers(userId: string, requesterId: string, cursor?: string, limit = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('존재하지 않는 유저입니다');

    const rows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        createdAt: true,
        follower: { select: USER_SUMMARY_SELECT },
      },
    });

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    const followerIds = items.map((r) => r.follower.id);
    const myFollowings = await this.prisma.follow.findMany({
      where: { followerId: requesterId, followingId: { in: followerIds } },
      select: { followingId: true },
    });
    const followingSet = new Set(myFollowings.map((f) => f.followingId));

    return {
      items: items.map((r) => ({
        ...r.follower,
        isFollowing: followingSet.has(r.follower.id),
        followedAt: r.createdAt,
      })),
      nextCursor,
      hasNext,
    };
  }

  async getFollowings(userId: string, requesterId: string, cursor?: string, limit = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('존재하지 않는 유저입니다');

    const rows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        createdAt: true,
        following: { select: USER_SUMMARY_SELECT },
      },
    });

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    const followingIds = items.map((r) => r.following.id);
    const myFollowings = await this.prisma.follow.findMany({
      where: { followerId: requesterId, followingId: { in: followingIds } },
      select: { followingId: true },
    });
    const followingSet = new Set(myFollowings.map((f) => f.followingId));

    return {
      items: items.map((r) => ({
        ...r.following,
        isFollowing: followingSet.has(r.following.id),
        followedAt: r.createdAt,
      })),
      nextCursor,
      hasNext,
    };
  }

  async getFollowStatus(requesterId: string, targetId: string) {
    if (requesterId === targetId) {
      return { isFollowing: false, isFollower: false };
    }

    const [following, follower] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: requesterId, followingId: targetId } },
        select: { id: true },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: targetId, followingId: requesterId } },
        select: { id: true },
      }),
    ]);

    return { isFollowing: !!following, isFollower: !!follower };
  }
}
