import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';

import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostsDto, PostSortType } from './dto/get-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { DetectService } from './detect.service';

const POST_SELECT = {
  id: true,
  title: true,
  description: true,
  viewCount: true,
  likeCount: true,
  bookmarkCount: true,
  trendScore: true,
  createdAt: true,
  author: {
    select: { id: true, nickname: true, profileImage: true },
  },
  images: {
    select: { id: true, imageUrl: true, order: true },
    orderBy: { order: 'asc' as const },
  },
  hashtags: {
    select: { id: true, name: true },
  },
};

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly detectService: DetectService,
  ) {}

  async create(
    userId: string,
    dto: CreatePostDto,
    files: Express.Multer.File[],
  ) {
    const hashtags = dto.hashtags ?? [];

    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        description: dto.description,
        authorId: userId,
        images: {
          create: files.map((file, index) => ({
            imageUrl: `/uploads/${file.filename}`,
            order: index,
          })),
        },
        hashtags: {
          connectOrCreate: hashtags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
      select: POST_SELECT,
    });

    if (files.length > 0) {
      const filePath = path.join(process.cwd(), 'uploads', files[0].filename);
      void this.detectService.detectFromFile(filePath).then(async (items) => {
        if (items.length === 0) return;
        await this.prisma.detectedProduct.createMany({
          data: items.map((item) => ({
            postId: post.id,
            name: item.name,
            category: item.category,
            confidence: item.confidence,
            positionX: item.positionX,
            positionY: item.positionY,
          })),
        });
      });
    }

    return post;
  }

  async findOne(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: POST_SELECT,
    });

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다');

    await this.prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    return post;
  }

  async findMany(userId: string, dto: GetPostsDto) {
    const { sort, cursor, limit = 20 } = dto;

    const cursorId = cursor;

    if (sort === PostSortType.FOLLOWING) {
      const followings = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = followings.map((f) => f.followingId);

      const posts = await this.prisma.post.findMany({
        where: { authorId: { in: followingIds }, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
        cursor: cursorId ? { id: cursorId } : undefined,
        skip: cursorId ? 1 : undefined,
        select: POST_SELECT,
      });

      return {
        posts,
        nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
      };
    }

    const posts = await this.prisma.post.findMany({
      where: { isDeleted: false },
      orderBy: { trendScore: 'desc' },
      take: limit,
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : undefined,
      select: POST_SELECT,
    });

    return {
      posts,
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    };
  }

  async update(
    userId: string,
    postId: string,
    dto: UpdatePostDto,
    files: Express.Multer.File[],
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
    });

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다');
    if (post.authorId !== userId)
      throw new ForbiddenException('수정 권한이 없습니다');

    const hashtags = dto.hashtags;

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(files.length > 0 && {
          images: {
            deleteMany: {},
            create: files.map((file, index) => ({
              imageUrl: `/uploads/${file.filename}`,
              order: index,
            })),
          },
        }),
        ...(hashtags && {
          hashtags: {
            set: [],
            connectOrCreate: hashtags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        }),
      },
      select: POST_SELECT,
    });
  }

  async remove(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
    });

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다');
    if (post.authorId !== userId)
      throw new ForbiddenException('삭제 권한이 없습니다');

    await this.prisma.post.update({
      where: { id: postId },
      data: { isDeleted: true },
    });
  }
}
