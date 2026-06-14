import { IsEmail } from 'class-validator';

export class SendEmailCodeDto {
  @IsEmail({}, { message: '유효한 이메일을 입력해주세요' })
  email: string;
}
