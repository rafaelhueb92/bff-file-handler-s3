import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { BasicAuthGuard } from './basic-auth.guard';

describe('BasicAuthGuard', () => {
  let guard: BasicAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BasicAuthGuard],
    }).compile();

    guard = module.get<BasicAuthGuard>(BasicAuthGuard);
  });

  beforeEach(() => {
    // Store original env variables
    process.env.APP_USER = 'testuser';
    process.env.APP_PASSWORD = 'testpass';
  });

  afterEach(() => {
    // Clean up env variables
    delete process.env.APP_USER;
    delete process.env.APP_PASSWORD;
  });

  const createMockExecutionContext = (headers: Record<string, string>) => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: headers,
        }),
      }),
    };
    return mockContext as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow access with valid credentials', () => {
      const credentials = Buffer.from('testuser:testpass').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentials}`,
      });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should throw UnauthorizedException when authorization header is missing', () => {
      const mockContext = createMockExecutionContext({});

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException(
          'Missing or invalid Basic Authorization header',
        ),
      );
    });

    it('should throw UnauthorizedException when authorization header is not Basic', () => {
      const mockContext = createMockExecutionContext({
        authorization: 'Bearer token',
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException(
          'Missing or invalid Basic Authorization header',
        ),
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', () => {
      const credentials = Buffer.from('wronguser:wrongpass').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentials}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException when username is wrong', () => {
      const credentials = Buffer.from('wronguser:testpass').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentials}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException when password is wrong', () => {
      const credentials = Buffer.from('testuser:wrongpass').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentials}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should handle malformed base64 credentials', () => {
      const mockContext = createMockExecutionContext({
        authorization: 'Basic invalid-base64',
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should handle missing credentials in base64 string', () => {
      const emptyCredentials = Buffer.from('').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${emptyCredentials}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should handle missing password in credentials', () => {
      const credentialsWithoutPassword =
        Buffer.from('testuser:').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentialsWithoutPassword}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should handle missing username in credentials', () => {
      const credentialsWithoutUsername =
        Buffer.from(':testpass').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentialsWithoutUsername}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should handle missing environment variables', () => {
      delete process.env.APP_USER;
      delete process.env.APP_PASSWORD;

      const credentials = Buffer.from('testuser:testpass').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentials}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should handle case-sensitive credentials', () => {
      const credentials = Buffer.from('TestUser:testpass').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentials}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should handle whitespace in credentials', () => {
      const credentials = Buffer.from(' testuser : testpass ').toString(
        'base64',
      );
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentials}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should handle multiple colons in credentials', () => {
      const credentials = Buffer.from('testuser:test:pass').toString('base64');
      const mockContext = createMockExecutionContext({
        authorization: `Basic ${credentials}`,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });
});
