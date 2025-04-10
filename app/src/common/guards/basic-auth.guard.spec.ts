import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { BasicAuthGuard } from './basic-auth.guard';
import { IS_PUBLIC_KEY } from '../decorator/public/public.decorator';

describe('BasicAuthGuard', () => {
  let guard: BasicAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BasicAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<BasicAuthGuard>(BasicAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  // Helper function to create mock context
  const createMockExecutionContext = (
    isPublic: boolean,
    authHeader?: string,
  ): ExecutionContext => {
    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authHeader,
          },
        }),
      }),
    } as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    return mockContext;
  };

  beforeEach(() => {
    process.env.APP_USER = 'testuser';
    process.env.APP_PASSWORD = 'testpass';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.APP_USER;
    delete process.env.APP_PASSWORD;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access to public routes', () => {
    const context = createMockExecutionContext(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException when no authorization header is present', () => {
    const context = createMockExecutionContext(false);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(
      'Missing or invalid Basic Authorization header',
    );
  });

  it('should throw UnauthorizedException when authorization header is not Basic', () => {
    const context = createMockExecutionContext(false, 'Bearer token');
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(
      'Missing or invalid Basic Authorization header',
    );
  });

  it('should throw UnauthorizedException when credentials are invalid', () => {
    const invalidCredentials = Buffer.from('wronguser:wrongpass').toString(
      'base64',
    );
    const context = createMockExecutionContext(
      false,
      `Basic ${invalidCredentials}`,
    );

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Invalid credentials');
  });

  it('should allow access with valid credentials', () => {
    const validCredentials =
      Buffer.from('testuser:testpass').toString('base64');
    const context = createMockExecutionContext(
      false,
      `Basic ${validCredentials}`,
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should handle malformed basic auth header', () => {
    const context = createMockExecutionContext(false, 'Basic invalid-base64');
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should handle missing credentials in basic auth header', () => {
    const emptyCredentials = Buffer.from('').toString('base64');
    const context = createMockExecutionContext(
      false,
      `Basic ${emptyCredentials}`,
    );
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should handle partial credentials in basic auth header', () => {
    const partialCredentials = Buffer.from('username:').toString('base64');
    const context = createMockExecutionContext(
      false,
      `Basic ${partialCredentials}`,
    );
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
