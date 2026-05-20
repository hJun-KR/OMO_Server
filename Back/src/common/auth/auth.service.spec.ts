import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { StyleKeyword } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('secret'),
  get: jest.fn().mockReturnValue('15m'),
};

const registerDto = {
  loginId: 'testuser',
  email: 'test@test.com',
  password: 'Test1234!',
  nickname: '테스트',
  styleKeyword: StyleKeyword.STREET,
  height: 170,
  weight: 65,
};

const loginDto = {
  loginId: 'testuser',
  password: 'Test1234!',
};

const mockUser = {
  id: 'uuid-1',
  loginId: 'testuser',
  email: 'test@test.com',
  password: '$2b$12$hashedpassword',
  nickname: '테스트',
  styleKeyword: StyleKeyword.STREET,
  height: 170,
  weight: 65,
  isDeleted: false,
};

const mockRefreshToken = {
  id: 'token-uuid-1',
  token: 'random-uuid',
  userId: 'uuid-1',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('중복 없을 시 유저 생성 후 반환', async () => {
      const created = {
        id: 'uuid-1',
        loginId: registerDto.loginId,
        nickname: registerDto.nickname,
        email: registerDto.email,
        createdAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.register(registerDto);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(created);
    });

    it('loginId 중복 시 ConflictException', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        loginId: registerDto.loginId,
        email: 'other@test.com',
        nickname: '다른닉네임',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('이미 사용 중인 아이디입니다'),
      );
    });

    it('email 중복 시 ConflictException', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        loginId: 'other',
        email: registerDto.email,
        nickname: '다른닉네임',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('이미 사용 중인 이메일입니다'),
      );
    });

    it('nickname 중복 시 ConflictException', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        loginId: 'other',
        email: 'other@test.com',
        nickname: registerDto.nickname,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('이미 사용 중인 닉네임입니다'),
      );
    });

    it('비밀번호가 bcrypt 해싱되어 저장됨', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        loginId: registerDto.loginId,
        nickname: registerDto.nickname,
        email: registerDto.email,
        createdAt: new Date(),
      });

      await service.register(registerDto);

      const [createArg] = mockPrisma.user.create.mock.calls[0] as [
        { data: { password: string } },
      ];
      expect(createArg.data.password).not.toBe(registerDto.password);
      expect(createArg.data.password).toMatch(/^\$2b\$/);
    });

    it('create 호출 시 DTO 필드가 모두 포함됨', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        loginId: registerDto.loginId,
        nickname: registerDto.nickname,
        email: registerDto.email,
        createdAt: new Date(),
      });

      await service.register(registerDto);

      const [createArg] = mockPrisma.user.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(createArg.data.loginId).toBe(registerDto.loginId);
      expect(createArg.data.email).toBe(registerDto.email);
      expect(createArg.data.nickname).toBe(registerDto.nickname);
      expect(createArg.data.styleKeyword).toBe(registerDto.styleKeyword);
      expect(createArg.data.height).toBe(registerDto.height);
      expect(createArg.data.weight).toBe(registerDto.weight);
    });

    it('findFirst에 loginId, email, nickname OR 조건 전달', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        loginId: registerDto.loginId,
        nickname: registerDto.nickname,
        email: registerDto.email,
        createdAt: new Date(),
      });

      await service.register(registerDto);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { loginId: registerDto.loginId },
              { email: registerDto.email },
              { nickname: registerDto.nickname },
            ],
          },
        }),
      );
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('로그인 성공 후 accessToken, refreshToken 반환', async () => {
      const hashed = await bcrypt.hash(loginDto.password, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashed,
      });
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login(loginDto, {});

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('로그인 성공 후 lastLoginAt 업데이트', async () => {
      const hashed = await bcrypt.hash(loginDto.password, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashed,
      });
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await service.login(loginDto, {});

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date) as Date,
          }),
        }),
      );
    });

    it('로그인 성공 시 refreshToken DB에 저장됨', async () => {
      const hashed = await bcrypt.hash(loginDto.password, 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashed,
      });
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await service.login(loginDto, {
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            userId: mockUser.id,
            userAgent: 'jest',
            ipAddress: '127.0.0.1',
          }),
        }),
      );
    });

    it('존재하지 않는 loginId면 UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto, {})).rejects.toThrow(
        new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다'),
      );
    });

    it('비밀번호 불일치 시 UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: await bcrypt.hash('WrongPass1!', 12),
      });

      await expect(service.login(loginDto, {})).rejects.toThrow(
        new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다'),
      );
    });

    it('isDeleted=true 유저는 UnauthorizedException', async () => {
      // isDeleted:false 조건으로 조회하면 null 반환 → 미인증
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('findUnique 호출 시 isDeleted:false 조건 포함', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto, {})).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ isDeleted: false }),
        }),
      );
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('새 토큰 발급 후 기존 refreshToken 삭제', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      mockPrisma.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      const result = await service.refresh(
        'uuid-1',
        'testuser',
        'token-uuid-1',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-uuid-1' },
      });
    });

    it('새 토큰 DB 저장 1회, 기존 토큰 삭제 1회', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      mockPrisma.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      await service.refresh('uuid-1', 'testuser', 'token-uuid-1');

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledTimes(1);
    });

    it('새 refreshToken JWT에 tokenId, sub, loginId 포함', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      mockPrisma.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      await service.refresh('uuid-1', 'testuser', 'token-uuid-1');

      const signCalls = mockJwt.sign.mock.calls as Array<
        [Record<string, unknown>, unknown]
      >;
      const refreshPayload = signCalls.find(
        ([payload]) => 'tokenId' in payload,
      )?.[0];
      expect(refreshPayload).toMatchObject({
        sub: 'uuid-1',
        loginId: 'testuser',
        tokenId: mockRefreshToken.id,
      });
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('tokenId로 refreshToken 삭제', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('token-uuid-1');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { id: 'token-uuid-1' },
      });
    });

    it('이미 삭제된 토큰도 에러 없이 처리 (count: 0)', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('non-existent-token')).resolves.not.toThrow();
    });

    it('반환값 없음 (void)', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('token-uuid-1');

      expect(result).toBeUndefined();
    });
  });

  // ─── updateProfile ────────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('nickname 변경 성공', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        nickname: '새닉네임',
      });

      const result = await service.updateProfile('uuid-1', {
        nickname: '새닉네임',
      });

      expect(result.nickname).toBe('새닉네임');
    });

    it('다른 유저의 nickname 중복 시 ConflictException', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'other-uuid' });

      await expect(
        service.updateProfile('uuid-1', { nickname: '중복닉네임' }),
      ).rejects.toThrow(new ConflictException('이미 사용 중인 닉네임입니다'));
    });

    it('nickname 없이 다른 필드만 수정 시 중복 체크 안 함', async () => {
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, height: 180 });

      await service.updateProfile('uuid-1', { height: 180 });

      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('nickname 중복 체크 시 본인 id 제외 조건 포함', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        nickname: '새닉네임',
      });

      await service.updateProfile('uuid-1', { nickname: '새닉네임' });

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nickname: '새닉네임', id: { not: 'uuid-1' } },
        }),
      );
    });

    it('update 호출 시 userId와 dto 필드 전달', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        height: 175,
        weight: 70,
      });

      await service.updateProfile('uuid-1', { height: 175, weight: 70 });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1' },
          data: { height: 175, weight: 70 },
        }),
      );
    });
  });

  // ─── getProfile ───────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    const profileResult = {
      id: 'uuid-1',
      loginId: 'testuser',
      nickname: '테스트',
      email: 'test@test.com',
      styleKeyword: 'STREET',
      height: 170,
      weight: 65,
      bio: null,
      profileImage: null,
      role: 'USER',
      createdAt: new Date(),
    };

    it('유저 정보 반환', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(profileResult);

      const result = await service.getProfile('uuid-1');

      expect(result).toEqual(profileResult);
    });

    it('findUnique에 id와 isDeleted:false 조건 전달', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(profileResult);

      await service.getProfile('uuid-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1', isDeleted: false },
        }),
      );
    });

    it('존재하지 않거나 탈퇴한 유저면 UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('uuid-1')).rejects.toThrow(
        new UnauthorizedException('유저를 찾을 수 없습니다'),
      );
    });
  });

  // ─── logoutAll ────────────────────────────────────────────────────────────────

  describe('logoutAll', () => {
    it('userId로 모든 refreshToken 삭제', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await service.logoutAll('uuid-1');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'uuid-1' },
      });
    });

    it('토큰이 없어도 에러 없이 처리 (count: 0)', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.logoutAll('uuid-1')).resolves.not.toThrow();
    });

    it('반환값 없음 (void)', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.logoutAll('uuid-1');

      expect(result).toBeUndefined();
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('비밀번호 변경 성공 후 모든 토큰 삭제', async () => {
      const hashed = await bcrypt.hash('Test1234!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ password: hashed });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      await service.changePassword('uuid-1', {
        currentPassword: 'Test1234!',
        newPassword: 'NewPass1!',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'uuid-1' },
      });
    });

    it('새 비밀번호가 bcrypt 해싱되어 저장됨', async () => {
      const hashed = await bcrypt.hash('Test1234!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ password: hashed });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.changePassword('uuid-1', {
        currentPassword: 'Test1234!',
        newPassword: 'NewPass1!',
      });

      const [updateArg] = mockPrisma.user.update.mock.calls[0] as [
        { data: { password: string } },
      ];
      expect(updateArg.data.password).not.toBe('NewPass1!');
      expect(updateArg.data.password).toMatch(/^\$2b\$/);
    });

    it('유저를 찾을 수 없으면 UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('uuid-1', {
          currentPassword: 'Test1234!',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(new UnauthorizedException('유저를 찾을 수 없습니다'));
    });

    it('현재 비밀번호 불일치 시 UnauthorizedException', async () => {
      const hashed = await bcrypt.hash('Test1234!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ password: hashed });

      await expect(
        service.changePassword('uuid-1', {
          currentPassword: 'WrongPass1!',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('현재 비밀번호가 올바르지 않습니다'),
      );
    });

    it('현재 비밀번호 불일치 시 update 호출 안 함', async () => {
      const hashed = await bcrypt.hash('Test1234!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ password: hashed });

      await expect(
        service.changePassword('uuid-1', {
          currentPassword: 'WrongPass1!',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('findUnique에 isDeleted:false 조건 포함', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('uuid-1', {
          currentPassword: 'Test1234!',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1', isDeleted: false },
        }),
      );
    });
  });

  // ─── withdraw ─────────────────────────────────────────────────────────────────

  describe('withdraw', () => {
    it('탈퇴 성공 - 토큰 삭제 후 isDeleted:true 처리', async () => {
      const hashed = await bcrypt.hash('Test1234!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ password: hashed });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.update.mockResolvedValue({});

      await service.withdraw('uuid-1', { password: 'Test1234!' });

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'uuid-1' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1' },
          data: { isDeleted: true },
        }),
      );
    });

    it('비밀번호 불일치 시 UnauthorizedException', async () => {
      const hashed = await bcrypt.hash('Test1234!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ password: hashed });

      await expect(
        service.withdraw('uuid-1', { password: 'WrongPass1!' }),
      ).rejects.toThrow(
        new UnauthorizedException('비밀번호가 올바르지 않습니다'),
      );
    });

    it('비밀번호 불일치 시 update 호출 안 함', async () => {
      const hashed = await bcrypt.hash('Test1234!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ password: hashed });

      await expect(
        service.withdraw('uuid-1', { password: 'WrongPass1!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('존재하지 않거나 탈퇴한 유저면 UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.withdraw('uuid-1', { password: 'Test1234!' }),
      ).rejects.toThrow(new UnauthorizedException('유저를 찾을 수 없습니다'));
    });

    it('findUnique에 isDeleted:false 조건 포함', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.withdraw('uuid-1', { password: 'Test1234!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-1', isDeleted: false },
        }),
      );
    });

    it('반환값 없음 (void)', async () => {
      const hashed = await bcrypt.hash('Test1234!', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ password: hashed });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.withdraw('uuid-1', {
        password: 'Test1234!',
      });

      expect(result).toBeUndefined();
    });
  });
});
