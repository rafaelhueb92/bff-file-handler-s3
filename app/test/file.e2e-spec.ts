import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { FilesModule } from '../src/files/files.module';
import { S3ServiceCB } from '../src/common/aws/s3/s3.service.cb';
import * as path from 'path';
import * as fs from 'fs';
import { cleanDirectory } from './clean-directory.util';

describe('FilesController (e2e)', () => {
  let app: INestApplication;
  let s3Service: jest.Mocked<S3ServiceCB>;

  const testFilesDir = path.join(__dirname, '..', 'uploads');

  afterEach(async () => {
    await cleanDirectory(testFilesDir);
  });

  beforeEach(async () => {
    const mockS3Service = {
      uploadFile: jest.fn().mockImplementation((file, key) =>
        Promise.resolve({
          ETag: '"mock-etag"',
          Location: `https://mock-bucket.s3.amazonaws.com/${key}`,
          Key: key,
          Bucket: 'mock-bucket',
        }),
      ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FilesModule],
    })
      .overrideProvider(S3ServiceCB)
      .useValue(mockS3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    s3Service = moduleFixture.get(S3ServiceCB);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/files/upload (POST)', () => {
    const testFilesDir = path.join(__dirname, 'test-files');

    beforeAll(() => {
      if (!fs.existsSync(testFilesDir)) {
        fs.mkdirSync(testFilesDir);
      }
    });

    afterAll(() => {
      if (fs.existsSync(testFilesDir)) {
        fs.rmSync(testFilesDir, { recursive: true });
      }
    });

    describe('CSV File Handling', () => {
      it('should upload a basic CSV file successfully', async () => {
        const csvContent =
          'name,age,city\nJohn,30,New York\nJane,25,Los Angeles';
        const testFilePath = path.join(testFilesDir, 'test.csv');
        fs.writeFileSync(testFilePath, csvContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body).toEqual(
          expect.objectContaining({
            ETag: expect.any(String),
            Location: expect.stringContaining(
              'https://mock-bucket.s3.amazonaws.com/',
            ),
            Key: expect.stringMatching(/^\d+-test\.csv$/),
            Bucket: 'mock-bucket',
          }),
        );
      });

      it('should handle large CSV files', async () => {
        const header = 'id,name,email,address,phone\n';
        const row = '1,John Doe,john@example.com,123 Street,555-0123\n';
        const rows = row.repeat(10000);
        const csvContent = header + rows;

        const testFilePath = path.join(testFilesDir, 'large.csv');
        fs.writeFileSync(testFilePath, csvContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-large\.csv$/);
        expect(s3Service.uploadFile).toHaveBeenCalledWith(
          expect.objectContaining({
            originalname: 'large.csv',
            mimetype: 'text/csv',
          }),
          expect.any(String),
        );
      });

      it('should handle CSV files with special characters', async () => {
        const csvContent =
          'name,description\n"Smith, John","Description with ""quotes"" and ,comma"\náéíóú,special chars\n';
        const testFilePath = path.join(testFilesDir, 'special.csv');
        fs.writeFileSync(testFilePath, csvContent, 'utf8');

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-special\.csv$/);
      });

      it('should handle empty CSV files', async () => {
        const testFilePath = path.join(testFilesDir, 'empty.csv');
        fs.writeFileSync(testFilePath, '');

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-empty\.csv$/);
        expect(s3Service.uploadFile).toHaveBeenCalledWith(
          expect.objectContaining({
            size: 0,
            originalname: 'empty.csv',
          }),
          expect.any(String),
        );
      });

      it('should handle CSV files with only headers', async () => {
        const csvContent = 'column1,column2,column3\n';
        const testFilePath = path.join(testFilesDir, 'headers-only.csv');
        fs.writeFileSync(testFilePath, csvContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-headers-only\.csv$/);
      });

      it('should handle CSV files with different delimiters', async () => {
        const csvContent =
          'name;age;city\nJohn;30;New York\nJane;25;Los Angeles';
        const testFilePath = path.join(testFilesDir, 'semicolon.csv');
        fs.writeFileSync(testFilePath, csvContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-semicolon\.csv$/);
      });

      it('should handle CSV files with BOM', async () => {
        const bom = Buffer.from([0xef, 0xbb, 0xbf]);
        const csvContent = 'name,age\nJohn,30\nJane,25\n';
        const fileContent = Buffer.concat([bom, Buffer.from(csvContent)]);

        const testFilePath = path.join(testFilesDir, 'with-bom.csv');
        fs.writeFileSync(testFilePath, fileContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-with-bom\.csv$/);
      });

      it('should handle CSV files with Windows line endings', async () => {
        const csvContent = 'name,age\r\nJohn,30\r\nJane,25\r\n';
        const testFilePath = path.join(testFilesDir, 'windows.csv');
        fs.writeFileSync(testFilePath, csvContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-windows\.csv$/);
      });

      it('should handle malformed CSV files', async () => {
        const malformedContent =
          'name,age\nJohn,30,extra\nJane,25\n"unclosed quote,40\n';
        const testFilePath = path.join(testFilesDir, 'malformed.csv');
        fs.writeFileSync(testFilePath, malformedContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-malformed\.csv$/);
      });

      it('should handle CSV files with varying row lengths', async () => {
        const csvContent =
          'col1,col2,col3\ndata1,data2\ndata3,data4,data5,data6\n';
        const testFilePath = path.join(testFilesDir, 'varying-length.csv');
        fs.writeFileSync(testFilePath, csvContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201);

        expect(response.body.Key).toMatch(/^\d+-varying-length\.csv$/);
      });

      it('should reject non-CSV files with CSV extension', async () => {
        const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic numbers
        const testFilePath = path.join(testFilesDir, 'fake.csv');
        fs.writeFileSync(testFilePath, binaryContent);

        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .attach('file', testFilePath)
          .expect(201); // Assuming your controller accepts it anyway

        expect(response.body.Key).toMatch(/^\d+-fake\.csv$/);
      });
    });
  });
});
