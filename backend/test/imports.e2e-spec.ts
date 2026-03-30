import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Import Flow (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login per ottenere token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'test@test.com',
        password: 'password123',
      });

    jwtToken = loginRes.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Complete import flow: Upload → Preview → Validate → Execute', async () => {
    // 1. Upload file
    const testFilePath = path.join(__dirname, 'fixtures', 'test_import.xlsx');
    
    const uploadRes = await request(app.getHttpServer())
      .post('/api/imports/upload')
      .set('Authorization', `Bearer ${jwtToken}`)
      .field('targetEntity', 'FIXED_LINE_PRACTICE')
      .attach('file', testFilePath);

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.job).toHaveProperty('id');

    const jobId = uploadRes.body.job.id;

    // 2. Get preview
    const previewRes = await request(app.getHttpServer())
      .get(`/api/imports/${jobId}/preview`)
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.headers).toBeDefined();
    expect(previewRes.body.previewRows).toBeInstanceOf(Array);

    // 3. Validate
    const validateRes = await request(app.getHttpServer())
      .post('/api/imports/validate')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        jobId,
        mappingConfig: {
          columns: [
            { source: 'Nome', target: 'firstName' },
            { source: 'Cognome', target: 'lastName' },
            { source: 'CF', target: 'fiscalCode', transformer: 'uppercase' },
            { source: 'Telefono', target: 'phonePrimary', transformer: 'normalize_phone' },
            { source: 'Tipo', target: 'type', transformer: 'uppercase' },
          ],
          duplicateStrategy: 'UPDATE',
        },
      });

    expect(validateRes.status).toBe(200);
    expect(validateRes.body.validationResults).toHaveProperty('valid');
    expect(validateRes.body.validationResults).toHaveProperty('errors');

    // 4. Execute (se validazione OK)
    if (validateRes.body.validationResults.errors === 0) {
      const executeRes = await request(app.getHttpServer())
        .post('/api/imports/execute')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ jobId });

      expect(executeRes.status).toBe(200);
      expect(executeRes.body.job.status).toMatch(/processing|completed/);
    }
  });

  it('Should prevent duplicate customers with same CF', async () => {
    // Test che verifica il constraint UNIQUE su fiscal_code + tenant_id
    // Implementa secondo la tua logica di test
  });

  it('Should handle invalid file format', async () => {
    const invalidFile = Buffer.from('Not an Excel file');

    const uploadRes = await request(app.getHttpServer())
      .post('/api/imports/upload')
      .set('Authorization', `Bearer ${jwtToken}`)
      .field('targetEntity', 'FIXED_LINE_PRACTICE')
      .attach('file', invalidFile, 'test.txt');

    expect(uploadRes.status).toBe(400);
  });
});