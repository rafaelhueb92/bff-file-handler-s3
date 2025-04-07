import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { RequestWithId } from '../../interfaces/request-with-id.interface';

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const dt = Date.now();
    const request: RequestWithId = context.switchToHttp().getRequest();

    const method = request.method;
    const url = request.url;

    request.id = uuidv4();
    console.log(`Initializing request with id ${request.id}`);

    return new Observable((subscriber) => {
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
  }
}
