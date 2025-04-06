import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientStorageException extends HttpException {
  constructor(message = 'Insufficient storage space.') {
    super(message, HttpStatus.INSUFFICIENT_STORAGE);
  }
}
