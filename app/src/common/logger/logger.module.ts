import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { ContextModule } from '../context-module/context.module';

@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
  imports: [ContextModule],
})
export class LoggerModule {}
