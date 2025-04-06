import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import * as fs from 'fs';
import { basename } from 'path';
import * as CircuitBreaker from 'opossum';

@Injectable()
export class S3Service {
  private readonly s3: S3;
  private readonly primaryBucket: string;
  private readonly fallbackBucket: string;
  private readonly logger = new Logger(S3Service.name);
  private readonly breaker: CircuitBreaker;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3();
    this.primaryBucket = this.configService.get('AWS_S3_BUCKET')!;
    this.fallbackBucket = this.configService.get('AWS_S3_BUCKET_BACKUP')!;

    this.breaker = new CircuitBreaker(
      (params: S3.PutObjectRequest) => this.s3.upload(params).promise(),
      {
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
      },
    );

    this.breaker.fallback(
      async (params: S3.PutObjectRequest, file: Express.Multer.File) => {
        this.logger.warn('⚠️ Fallback ativado: tentando bucket de backup...');

        const fallbackStream = fs.createReadStream(file.path);

        const fallbackParams = {
          ...params,
          Bucket: this.fallbackBucket,
          Body: fallbackStream,
        };

        try {
          const result = await this.s3.upload(fallbackParams).promise();
          this.logger.log('✅ Upload no bucket de fallback');
          return result;
        } catch (error) {
          this.logger.error('❌ Fallback falhou: ' + error.message);
          throw new ServiceUnavailableException(
            'Serviço indisponível - ambos os buckets falharam',
          );
        }
      },
    );

    this.breaker.on('open', () =>
      this.logger.warn('🛑 Circuito aberto - chamadas bloqueadas'),
    );
    this.breaker.on('close', () =>
      this.logger.log('✅ Circuito fechado - normal'),
    );
    this.breaker.on('halfOpen', () =>
      this.logger.log('🟡 Circuito meio-aberto - teste em progresso'),
    );
  }

  async uploadFile(file: Express.Multer.File) {
    const { path, originalname, mimetype } = file;
    const stream = fs.createReadStream(path);
    const key = `${Date.now()}-${basename(originalname)}`;

    const params: S3.PutObjectRequest = {
      Bucket: this.primaryBucket,
      Key: key,
      Body: stream,
      ContentType: mimetype,
    };

    try {
      const result = await this.breaker.fire(params, file);
      fs.unlink(path, () => {});
      return result;
    } catch (error) {
      this.logger.error('Erro total no upload: ' + error.message);
      throw error;
    }
  }
}
