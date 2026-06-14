import { IsString, Length } from 'class-validator';

export class VerifyEmailCodeDto {
  @IsString()
  pendingToken: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
