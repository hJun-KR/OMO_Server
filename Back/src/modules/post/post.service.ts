import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_POST_DETECTION } from '../../queue/bull.module';
import { PostDetectionJob } from '../../queue/processors/post-detection.processor';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostsDto, PostSortType } from './dto/get-posts.dto';
import { UpdateDetectedProductsDto } from './dto/update-detected-products.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const POST_SELECT = {
  id: true,
  title: true,
  description: true,
  viewCount: true,
  likeCount: true,
  bookmarkCount: true,
  trendScore: true,
  detectionStatus: true,
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
  detectedProducts: {
    select: {
      id: true,
      category: true,
      confidence: true,
      positionX: true,
      positionY: true,
      width: true,
      height: true,
      productId: true,
      isEdited: true,
    },
  },
};

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_POST_DETECTION)
    private readonly detectionQueue: Queue<PostDetectionJob>,
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
        detectionStatus: files.length > 0 ? 'PENDING' : 'COMPLETED',
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

    return post;
  }

  async triggerDetection(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: {
        id: true,
        authorId: true,
        detectionStatus: true,
        images: {
          select: { imageUrl: true },
          orderBy: { order: 'asc' as const },
          take: 1,
        },
      },
    });

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다');
    if (post.authorId !== userId)
      throw new ForbiddenException('권한이 없습니다');
    if (post.images.length === 0)
      throw new NotFoundException('이미지가 없습니다');

    const filePath = process.cwd() + post.images[0].imageUrl;
    await this.detectionQueue.add({ postId, filePath });

    return { detectionStatus: 'PENDING' };
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

  async updateDetectedProducts(
    userId: string,
    postId: string,
    dto: UpdateDetectedProductsDto,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
    });

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다');
    if (post.authorId !== userId)
      throw new ForbiddenException('수정 권한이 없습니다');

    await Promise.all(
      dto.items.map((item) =>
        this.prisma.detectedProduct.update({
          where: { id: item.id },
          data: {
            ...(item.productId !== undefined && { productId: item.productId }),
            ...(item.isEdited !== undefined && { isEdited: item.isEdited }),
          },
        }),
      ),
    );

    return this.prisma.post.findUnique({
      where: { id: postId },
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
