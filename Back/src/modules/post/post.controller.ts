import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request as ExpressRequest } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostsDto } from './dto/get-posts.dto';
import { UpdateDetectedProductsDto } from './dto/update-detected-products.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostService } from './post.service';

interface AuthRequest extends ExpressRequest {
  user: { id: string; loginId: string; role: string };
}

const imageStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 10, { storage: imageStorage }))
  create(
    @Request() req: AuthRequest,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.postService.create(req.user.id, dto, files ?? []);
  }

  @Get()
  findMany(@Request() req: AuthRequest, @Query() dto: GetPostsDto) {
    return this.postService.findMany(req.user.id, dto);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.postService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 10, { storage: imageStorage }))
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.postService.update(req.user.id, id, dto, files ?? []);
  }

  @Post(':id/like')
  likePost(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.postService.likePost(req.user.id, id);
  }

  @Post(':id/bookmark')
  bookmarkPost(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.postService.bookmarkPost(req.user.id, id);
  }

  @Get('bookmarks/me')
  getMyBookmarks(
    @Request() req: AuthRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postService.getMyBookmarks(
      req.user.id,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Post(':id/detect')
  triggerDetection(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.postService.triggerDetection(req.user.id, id);
  }

  @Patch(':id/detected-products')
  updateDetectedProducts(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDetectedProductsDto,
  ) {
    return this.postService.updateDetectedProducts(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.postService.remove(req.user.id, id);
  }
}
