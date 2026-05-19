import { IsString } from 'class-validator';

export class WithdrawDto {
  @IsString()
  password: string;
}
