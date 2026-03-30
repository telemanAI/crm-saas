import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportsService } from './imports.service';
import { ImportJob } from './entities/import-job.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { FixedLineAdapter } from './adapters/fixed-line.adapter';

describe('ImportsService', () => {
  let service: ImportsService;
  let jobRepository: Repository<ImportJob>;
  let templateRepository: Repository<ImportTemplate>;

  const mockJobRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTemplateRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockFixedLineAdapter = {
    validateRow: jest.fn(),
    processRow: jest.fn(),
    getTargetFields: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsService,
        {
          provide: getRepositoryToken(ImportJob),
          useValue: mockJobRepository,
        },
        {
          provide: getRepositoryToken(ImportTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: FixedLineAdapter,
          useValue: mockFixedLineAdapter,
        },
      ],
    }).compile();

    service = module.get<ImportsService>(ImportsService);
    jobRepository = module.get<Repository<ImportJob>>(getRepositoryToken(ImportJob));
    templateRepository = module.get<Repository<ImportTemplate>>(getRepositoryToken(ImportTemplate));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should create import job successfully', async () => {
      const mockFile = {
        originalname: 'test.xlsx',
        buffer: Buffer.from('test'),
        size: 1024,
      } as Express.Multer.File;

      const mockJob = {
        id: 'uuid-123',
        tenantId: 'tenant-1',
        fileName: 'test.xlsx',
        status: 'pending',
      };

      mockJobRepository.create.mockReturnValue(mockJob);
      mockJobRepository.save.mockResolvedValue(mockJob);

      const result = await service.uploadFile(
        mockFile,
        'FIXED_LINE_PRACTICE',
        'tenant-1',
        'user-1',
      );

      expect(result).toEqual(mockJob);
      expect(mockJobRepository.create).toHaveBeenCalled();
      expect(mockJobRepository.save).toHaveBeenCalled();
    });
  });

  describe('getJobs', () => {
    it('should return jobs for tenant', async () => {
      const mockJobs = [
        { id: '1', fileName: 'file1.xlsx', status: 'completed' },
        { id: '2', fileName: 'file2.xlsx', status: 'processing' },
      ];

      mockJobRepository.find.mockResolvedValue(mockJobs);

      const result = await service.getJobs('tenant-1');

      expect(result).toEqual(mockJobs);
      expect(mockJobRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });
  });

  describe('validateImport', () => {
    it('should validate rows successfully', async () => {
      const mockJob = {
        id: 'job-1',
        tenantId: 'tenant-1',
        filePath: '/path/to/file.xlsx',
        targetEntity: 'FIXED_LINE_PRACTICE',
      };

      mockJobRepository.findOne.mockResolvedValue(mockJob);
      mockFixedLineAdapter.validateRow.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        data: { firstName: 'Mario' },
      });

      const mappingConfig = {
        columns: [{ source: 'Nome', target: 'firstName' }],
        duplicateStrategy: 'UPDATE',
      };

      const result = await service.validateImport('job-1', mappingConfig, 'tenant-1');

      expect(result.valid).toBeGreaterThan(0);
      expect(mockFixedLineAdapter.validateRow).toHaveBeenCalled();
    });
  });
});