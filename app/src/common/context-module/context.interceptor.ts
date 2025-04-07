import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ContextService } from './context.service';
import { RequestWithId } from '../interfaces/request-with-id.interface';

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  constructor(private readonly contextService: ContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: RequestWithId = context.switchToHttp().getRequest();
    return new Observable((subscriber) => {
      this.contextService.run(request, () => {
        this.contextService.set('id', request.id);
        this.contextService.set('ip', request.ip);

        const className = context.getClass().name;
        const methodName = context.getHandler().name;

        this.contextService.set('class', className);
        this.contextService.set('method', methodName);

        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
