import { HttpException } from '@nestjs/common';

export class InsufficientCPUorMemoryUsagesException extends HttpException {
  constructor(message = 'Insufficient CPU or Memory.') {
    super(message, 111);
  }
}
