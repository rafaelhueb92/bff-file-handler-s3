import { Injectable, NestMiddleware } from '@nestjs/common';
import { LoggerService } from '../../logger/logger.service';
import { RequestWithId } from '../../interfaces/request-with-id.interface';
import { HealthService } from '../../../health/health.service';
import { InsufficientStorageException } from '../../exceptions/insufficient-storage.exception';

@Injectable()
export class SpaceReservedMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: LoggerService,
    private readonly healthService: HealthService,
  ) {}
  private reservedCapacity: number = 0;
  async use(request: RequestWithId, _: any, next: () => void) {
    console.log('Reserved Total Capacity', this.reservedCapacity);
    const file = request.file;

    let fileSize = 0;

    if (file) {
      fileSize = file.size;
      const freeDiskSpace = await this.healthService.getFreeSpaceDisk();

      this.logger.info('Uploading file size (bytes):', {
        id: request.id,
        fileSize,
      });
      this.reservedCapacity += fileSize;

      if (
        fileSize >
        freeDiskSpace + this.reservedCapacity - 500 * 1024 * 1024
      ) {
        this.logger.info('Volume not supports the file size!', {
          id: request.id,
          freeDiskSpace,
          reservedCapacity: this.reservedCapacity,
          fileSize,
        });
        throw new InsufficientStorageException();
      }
    }

    console.log(
      'Reserved Total Capacity after ID',
      request.id,
      this.reservedCapacity,
    );

    next();
  }
}
