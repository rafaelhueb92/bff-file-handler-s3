import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorator/public/public.decorator';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check the decorator to be public, no need auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const localAuthHeader =
      request.headers['authorization'] ||
      request.headers['Authorization'] ||
      request.headers['AUTHORIZATION'];

    const albAuthHeader =
      request.headers['x-amzn-authorization'] ||
      request.headers['X-Amzn-Authorization'];

    const authHeader = localAuthHeader || albAuthHeader;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException(
        'Missing or invalid Basic Authorization header',
      );
    }

    const base64Credentials = authHeader.split(' ')[1];
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    const valid =
      username === process.env.APP_USER &&
      password === process.env.APP_PASSWORD;

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return true;
  }
}
