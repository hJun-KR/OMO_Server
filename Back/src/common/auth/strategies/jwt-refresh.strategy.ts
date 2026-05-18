import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { Request } from 'express';

export interface JwtRefreshPayload {
  sub: string;
  loginId: string;
  tokenId: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(_req: Request, payload: JwtRefreshPayload) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
    });

    if (!token)
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다');
    if (token.expiresAt < new Date())
      throw new UnauthorizedException('만료된 리프레시 토큰입니다');

    return {
      id: payload.sub,
      loginId: payload.loginId,
      tokenId: payload.tokenId,
    };
  }
}
