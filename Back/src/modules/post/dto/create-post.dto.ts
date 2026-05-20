import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hashtags?: string[];
}
