import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum PostSortType {
  FOLLOWING = 'following',
  TRENDING = 'trending',
}

export class GetPostsDto {
  @IsEnum(PostSortType)
  @IsOptional()
  sort?: PostSortType = PostSortType.TRENDING;

  @IsString()
  @IsOptional()
  cursor?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
