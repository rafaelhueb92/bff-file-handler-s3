import { BasicAuthGuard } from './basic-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('BasicAuthGuard', () => {
  let guard: BasicAuthGuard;

  beforeEach(() => {
    guard = new BasicAuthGuard();

    process.env.APP_USER = 'admin';
    process.env.APP_PASSWORD = 'secret';
  });

  const mockContext = (authHeader: string | undefined): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authHeader,
          },
        }),
      }),
    }) as any;

  it('should throw if Authorization header is missing', () => {
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if Authorization header is not Basic', () => {
    expect(() => guard.canActivate(mockContext('Bearer sometoken'))).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if credentials are invalid', () => {
    const invalidCreds = Buffer.from('wrong:creds').toString('base64');
    expect(() =>
      guard.canActivate(mockContext(`Basic ${invalidCreds}`)),
    ).toThrow(UnauthorizedException);
  });

  it('should return true if credentials are valid', () => {
    const validCreds = Buffer.from('admin:secret').toString('base64');
    expect(guard.canActivate(mockContext(`Basic ${validCreds}`))).toBe(true);
  });
});
