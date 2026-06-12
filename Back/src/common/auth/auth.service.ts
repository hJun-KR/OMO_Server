import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import type { StringValue } from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeLoginIdDto } from './dto/change-login-id.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { WithdrawDto } from './dto/withdraw.dto';

const PROFILE_SELECT = {
  id: true,
  loginId: true,
  nickname: true,
  email: true,
  isEmailVerified: true,
  styleKeyword: true,
  height: true,
  weight: true,
  bio: true,
  profileImage: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async checkLoginId(loginId: string) {
    const exists = await this.prisma.user.findUnique({
      where: { loginId },
      select: { id: true },
    });
    return { available: !exists };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ loginId: dto.loginId }, { email: dto.email }] },
      select: { loginId: true, email: true },
    });

    if (exists) {
      if (exists.loginId === dto.loginId)
        throw new ConflictException('이미 사용 중인 아이디입니다');
      throw new ConflictException('이미 사용 중인 이메일입니다');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: { id: true, loginId: true, nickname: true, email: true, createdAt: true },
    });

    await this.sendVerificationEmail(user.id, dto.email);
    return user;
  }

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.emailVerification.deleteMany({ where: { userId } });
    await this.prisma.emailVerification.create({
      data: { userId, code, sendCount: 1, expiresAt },
    });

    await this.dispatchEmail(email, code);
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { email: true, isEmailVerified: true },
    });
    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다');
    if (user.isEmailVerified)
      throw new BadRequestException('이미 인증된 이메일입니다');

    const record = await this.prisma.emailVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (record && record.sendCount >= 3)
      throw new BadRequestException('이메일 재발송은 최대 3회까지 가능합니다');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (record) {
      await this.prisma.emailVerification.update({
        where: { id: record.id },
        data: { code, expiresAt, sendCount: { increment: 1 } },
      });
    } else {
      await this.prisma.emailVerification.create({
        data: { userId, code, sendCount: 1, expiresAt },
      });
    }

    await this.dispatchEmail(user.email, code);
  }

  private async dispatchEmail(to: string, code: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAILER_HOST', 'smtp.zoho.com'),
      port: this.config.get<number>('MAILER_PORT', 465),
      secure: true,
      auth: {
        user: this.config.get<string>('MAILER_USER'),
        pass: this.config.get<string>('MAILER_PASS'),
      },
    });

    await transporter.sendMail({
      from: this.config.get<string>('MAILER_FROM'),
      to,
      subject: '[OMO] 이메일 인증',
      text: `인증 코드: ${code}\n10분 내에 입력해주세요.`,
    });
  }

  async verifyEmail(userId: string, code: string): Promise<void> {
    const record = await this.prisma.emailVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException('인증 코드가 없습니다');
    if (record.expiresAt < new Date())
      throw new BadRequestException('인증 코드가 만료되었습니다');
    if (record.code !== code)
      throw new BadRequestException('인증 코드가 올바르지 않습니다');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
    await this.prisma.emailVerification.deleteMany({ where: { userId } });
  }

  async login(dto: LoginDto, meta: { userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { loginId: dto.loginId, isDeleted: false },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다',
      );
    }

    const tokens = await this.issueTokens(user.id, user.loginId, meta);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return tokens;
  }

  async refresh(userId: string, loginId: string, tokenId: string) {
    const tokens = await this.issueTokens(userId, loginId, {});
    await this.prisma.refreshToken.delete({ where: { id: tokenId } });
    return tokens;
  }

  async logout(tokenId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { id: tokenId } });
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: PROFILE_SELECT,
    });

    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.nickname) {
      const conflict = await this.prisma.user.findFirst({
        where: { nickname: dto.nickname, id: { not: userId } },
      });
      if (conflict) throw new ConflictException('이미 사용 중인 닉네임입니다');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: PROFILE_SELECT,
    });
  }

  async changeLoginId(userId: string, dto: ChangeLoginIdDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { password: true },
    });

    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid)
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');

    const conflict = await this.prisma.user.findUnique({
      where: { loginId: dto.newLoginId },
      select: { id: true },
    });
    if (conflict) throw new ConflictException('이미 사용 중인 아이디입니다');

    await this.prisma.user.update({
      where: { id: userId },
      data: { loginId: dto.newLoginId },
    });

    // loginId가 JWT 클레임에 포함되므로 모든 기기 강제 로그아웃
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { password: true },
    });

    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid)
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { password: true },
    });

    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('비밀번호가 올바르지 않습니다');

    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true },
    });
  }

  private async issueTokens(
    userId: string,
    loginId: string,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const accessToken = this.jwt.sign(
      { sub: userId, loginId },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_EXPIRES_IN',
          '15m',
        ) as StringValue,
      },
    );

    const refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const storedToken = await this.prisma.refreshToken.create({
      data: {
        userId,
        token: crypto.randomUUID(),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    const refreshToken = this.jwt.sign(
      { sub: userId, loginId, tokenId: storedToken.id },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn as StringValue,
      },
    );

    return { accessToken, refreshToken };
  }
}
