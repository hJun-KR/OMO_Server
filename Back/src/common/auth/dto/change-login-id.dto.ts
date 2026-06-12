import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangeLoginIdDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Id는 영문, 숫자, 밑줄만 허용됩니다',
  })
  newLoginId: string;

  @IsString()
  currentPassword: string;
}
