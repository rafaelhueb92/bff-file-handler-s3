import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from './request-context.service';
import { v4 as uuidv4 } from 'uuid';
import { RequestWithId } from '../interfaces/request-with-id.interface';

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  constructor(private readonly contextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const dt = Date.now();
    const request: RequestWithId = context.switchToHttp().getRequest();
    request.id = uuidv4();
    console.log(`Initializing request with id ${request.id}`);
    return new Observable((subscriber) => {
      this.contextService.run(request, () => {
        this.contextService.set('id', request.id);

        const className = context.getClass().name;
        const methodName = context.getHandler().name;

        const method = request.method;
        const url = request.url;

        this.contextService.set('class', className);
        this.contextService.set('method', methodName);

        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => {
            console.log(
              `Request ${request.id} for ${method} ${url} completed in ${
                Date.now() - dt
              }ms`,
            );
            return subscriber.complete();
          },
        });
      });
    });
  }
}
