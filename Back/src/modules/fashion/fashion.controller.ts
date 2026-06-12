import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { FashionService } from './fashion.service';

const imageStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

// WORKFLOW 섹션 17: POST /ai/search
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class FashionController {
  constructor(private readonly fashionService: FashionService) {}

  @Post('search')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          cb(new BadRequestException('이미지 파일만 업로드 가능합니다'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  search(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('이미지를 업로드해주세요');
    return this.fashionService.search(file);
  }
}
