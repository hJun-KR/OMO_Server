import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
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

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [
          { loginId: dto.loginId },
          { email: dto.email },
          { nickname: dto.nickname },
        ],
      },
      select: { loginId: true, email: true, nickname: true },
    });

    if (exists) {
      if (exists.loginId === dto.loginId)
        throw new ConflictException('이미 사용 중인 아이디입니다');
      if (exists.email === dto.email)
        throw new ConflictException('이미 사용 중인 이메일입니다');
      throw new ConflictException('이미 사용 중인 닉네임입니다');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: {
        id: true,
        loginId: true,
        nickname: true,
        email: true,
        createdAt: true,
      },
    });
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
