import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hashtags?: string[];
}
