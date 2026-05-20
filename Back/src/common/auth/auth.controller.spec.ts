import { Test, TestingModule } from '@nestjs/testing';
import { StyleKeyword } from '@prisma/client';
import { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  withdraw: jest.fn(),
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

const mockTokens = {
  accessToken: 'mock.access.token',
  refreshToken: 'mock.refresh.token',
};

const mockReq = (user?: object, overrides?: Partial<Request>) =>
  ({
    headers: { 'user-agent': 'jest' },
    ip: '127.0.0.1',
    user,
    ...overrides,
  }) as unknown as Request;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('회원가입 성공 시 authService.register 호출 후 결과 반환', async () => {
      const created = {
        id: 'uuid-1',
        loginId: registerDto.loginId,
        email: registerDto.email,
        nickname: registerDto.nickname,
        createdAt: new Date(),
      };
      mockAuthService.register.mockResolvedValue(created);

      const result = await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(created);
    });

    it('authService.register를 정확히 1회 호출', async () => {
      mockAuthService.register.mockResolvedValue({});

      await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('authService.register가 throw하면 그대로 전파', async () => {
      mockAuthService.register.mockRejectedValue(new Error('중복'));

      await expect(controller.register(registerDto)).rejects.toThrow('중복');
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('로그인 성공 시 토큰 반환', async () => {
      mockAuthService.login.mockResolvedValue(mockTokens);
      const dto = { loginId: 'testuser', password: 'Test1234!' };

      const result = await controller.login(dto, mockReq());

      expect(result).toEqual(mockTokens);
    });

    it('authService.login에 dto와 userAgent, ipAddress 전달', async () => {
      mockAuthService.login.mockResolvedValue(mockTokens);
      const dto = { loginId: 'testuser', password: 'Test1234!' };

      await controller.login(dto, mockReq());

      expect(mockAuthService.login).toHaveBeenCalledWith(dto, {
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      });
    });

    it('user-agent 헤더가 없으면 userAgent: undefined 전달', async () => {
      mockAuthService.login.mockResolvedValue(mockTokens);
      const dto = { loginId: 'testuser', password: 'Test1234!' };
      const req = mockReq(undefined, { headers: {} } as Partial<Request>);

      await controller.login(dto, req);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto, {
        userAgent: undefined,
        ipAddress: '127.0.0.1',
      });
    });

    it('authService.login이 throw하면 그대로 전파', async () => {
      mockAuthService.login.mockRejectedValue(new Error('인증 실패'));

      await expect(
        controller.login({ loginId: 'x', password: 'y' }, mockReq()),
      ).rejects.toThrow('인증 실패');
    });
  });

  // ─── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('토큰 갱신 성공', async () => {
      mockAuthService.refresh.mockResolvedValue(mockTokens);
      const req = mockReq({
        id: 'uuid-1',
        loginId: 'testuser',
        tokenId: 'token-1',
      });

      const result = await controller.refresh(req as never);

      expect(result).toEqual(mockTokens);
    });

    it('req.user에서 id, loginId, tokenId 추출하여 authService.refresh 호출', async () => {
      mockAuthService.refresh.mockResolvedValue(mockTokens);
      const req = mockReq({
        id: 'uuid-1',
        loginId: 'testuser',
        tokenId: 'token-1',
      });

      await controller.refresh(req as never);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        'uuid-1',
        'testuser',
        'token-1',
      );
    });

    it('authService.refresh를 정확히 1회 호출', async () => {
      mockAuthService.refresh.mockResolvedValue(mockTokens);
      const req = mockReq({
        id: 'uuid-1',
        loginId: 'testuser',
        tokenId: 'token-1',
      });

      await controller.refresh(req as never);

      expect(mockAuthService.refresh).toHaveBeenCalledTimes(1);
    });
  });

  // ─── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('로그아웃 성공', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const req = mockReq({
        id: 'uuid-1',
        loginId: 'testuser',
        tokenId: 'token-1',
      });

      await controller.logout(req as never);

      expect(mockAuthService.logout).toHaveBeenCalledWith('token-1');
    });

    it('req.user.tokenId만 추출하여 authService.logout 호출', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const req = mockReq({
        id: 'uuid-99',
        loginId: 'other',
        tokenId: 'token-xyz',
      });

      await controller.logout(req as never);

      expect(mockAuthService.logout).toHaveBeenCalledWith('token-xyz');
    });

    it('authService.logout를 정확히 1회 호출', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const req = mockReq({
        id: 'uuid-1',
        loginId: 'testuser',
        tokenId: 'token-1',
      });

      await controller.logout(req as never);

      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });
  });

  // ─── updateProfile ───────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('프로필 수정 성공 후 결과 반환', async () => {
      const updated = {
        ...registerDto,
        id: 'uuid-1',
        bio: null,
        profileImage: null,
      };
      mockAuthService.updateProfile.mockResolvedValue(updated);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });
      const dto = { nickname: '새닉네임' };

      const result = await controller.updateProfile(req as never, dto);

      expect(result).toEqual(updated);
    });

    it('req.user.id와 dto를 authService.updateProfile에 전달', async () => {
      mockAuthService.updateProfile.mockResolvedValue({});
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });
      const dto = { nickname: '새닉네임' };

      await controller.updateProfile(req as never, dto);

      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('uuid-1', dto);
    });

    it('다양한 필드 수정 시 dto 전체를 그대로 전달', async () => {
      mockAuthService.updateProfile.mockResolvedValue({});
      const req = mockReq({ id: 'uuid-2', loginId: 'testuser2' });
      const dto = { height: 180, weight: 75, bio: '안녕하세요' };

      await controller.updateProfile(req as never, dto);

      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('uuid-2', dto);
    });

    it('authService.updateProfile이 throw하면 그대로 전파', async () => {
      mockAuthService.updateProfile.mockRejectedValue(new Error('닉네임 중복'));
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await expect(
        controller.updateProfile(req as never, { nickname: '중복' }),
      ).rejects.toThrow('닉네임 중복');
    });

    it('authService.updateProfile을 정확히 1회 호출', async () => {
      mockAuthService.updateProfile.mockResolvedValue({});
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.updateProfile(req as never, { nickname: '새닉네임' });

      expect(mockAuthService.updateProfile).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getProfile ──────────────────────────────────────────────────────────────

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

    it('내 정보 반환', async () => {
      mockAuthService.getProfile.mockResolvedValue(profileResult);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      const result = await controller.getProfile(req as never);

      expect(result).toEqual(profileResult);
    });

    it('req.user.id를 authService.getProfile에 전달', async () => {
      mockAuthService.getProfile.mockResolvedValue(profileResult);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.getProfile(req as never);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('uuid-1');
    });

    it('authService.getProfile을 정확히 1회 호출', async () => {
      mockAuthService.getProfile.mockResolvedValue(profileResult);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.getProfile(req as never);

      expect(mockAuthService.getProfile).toHaveBeenCalledTimes(1);
    });

    it('authService.getProfile이 throw하면 그대로 전파', async () => {
      mockAuthService.getProfile.mockRejectedValue(new Error('찾을 수 없음'));
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await expect(controller.getProfile(req as never)).rejects.toThrow(
        '찾을 수 없음',
      );
    });
  });

  // ─── logoutAll ───────────────────────────────────────────────────────────────

  describe('logoutAll', () => {
    it('전체 기기 로그아웃 성공', async () => {
      mockAuthService.logoutAll.mockResolvedValue(undefined);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.logoutAll(req as never);

      expect(mockAuthService.logoutAll).toHaveBeenCalledWith('uuid-1');
    });

    it('authService.logoutAll을 정확히 1회 호출', async () => {
      mockAuthService.logoutAll.mockResolvedValue(undefined);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.logoutAll(req as never);

      expect(mockAuthService.logoutAll).toHaveBeenCalledTimes(1);
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────────

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'Test1234!',
      newPassword: 'NewPass1!',
    };

    it('비밀번호 변경 성공', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.changePassword(req as never, changePasswordDto);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'uuid-1',
        changePasswordDto,
      );
    });

    it('authService.changePassword를 정확히 1회 호출', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.changePassword(req as never, changePasswordDto);

      expect(mockAuthService.changePassword).toHaveBeenCalledTimes(1);
    });

    it('authService.changePassword가 throw하면 그대로 전파', async () => {
      mockAuthService.changePassword.mockRejectedValue(
        new Error('현재 비밀번호 불일치'),
      );
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await expect(
        controller.changePassword(req as never, changePasswordDto),
      ).rejects.toThrow('현재 비밀번호 불일치');
    });
  });

  // ─── withdraw ─────────────────────────────────────────────────────────────────

  describe('withdraw', () => {
    const withdrawDto = { password: 'Test1234!' };

    it('회원탈퇴 성공', async () => {
      mockAuthService.withdraw.mockResolvedValue(undefined);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.withdraw(req as never, withdrawDto);

      expect(mockAuthService.withdraw).toHaveBeenCalledWith(
        'uuid-1',
        withdrawDto,
      );
    });

    it('authService.withdraw를 정확히 1회 호출', async () => {
      mockAuthService.withdraw.mockResolvedValue(undefined);
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await controller.withdraw(req as never, withdrawDto);

      expect(mockAuthService.withdraw).toHaveBeenCalledTimes(1);
    });

    it('authService.withdraw가 throw하면 그대로 전파', async () => {
      mockAuthService.withdraw.mockRejectedValue(new Error('비밀번호 불일치'));
      const req = mockReq({ id: 'uuid-1', loginId: 'testuser' });

      await expect(
        controller.withdraw(req as never, withdrawDto),
      ).rejects.toThrow('비밀번호 불일치');
    });
  });
});
