import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StyleKeyword } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Id는 영문, 숫자, 밑줄만 허용됩니다',
  })
  loginId: string;

  @IsEmail({}, { message: '유효한 이메일을 입력해주세요' })
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: '비밀번호는 대소문자, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;

  @IsEnum(StyleKeyword, {
    message: `styleKeyword는 ${Object.values(StyleKeyword).join(', ')} 중 하나여야 합니다`,
  })
  styleKeyword: StyleKeyword;

  @IsInt()
  @Min(100)
  @Max(250)
  height: number;

  @IsInt()
  @Min(20)
  @Max(300)
  weight: number;
}
