import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StyleKeyword } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname?: string;

  @IsOptional()
  @IsEnum(StyleKeyword, {
    message: `styleKeyword는 ${Object.values(StyleKeyword).join(', ')} 중 하나여야 합니다`,
  })
  styleKeyword?: StyleKeyword;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  weight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: '유효한 URL을 입력해주세요' })
  profileImage?: string;
}
