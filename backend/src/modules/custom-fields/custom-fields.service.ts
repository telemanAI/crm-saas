import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomField, FieldType } from './entities/custom-field.entity';
import { CustomFieldValue } from './entities/custom-field-value.entity';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomField)
    private customFieldRepo: Repository<CustomField>,
    @InjectRepository(CustomFieldValue)
    private customFieldValueRepo: Repository<CustomFieldValue>,
  ) {}

  async createField(tenantId: string, dto: CreateCustomFieldDto, userId: string): Promise<CustomField> {
    const existing = await this.customFieldRepo.findOne({
      where: {
        tenantId,
        entityType: dto.entityType,
        fieldName: dto.fieldName,
      },
    });

    if (existing) {
      throw new BadRequestException('Campo ' + dto.fieldName + ' gia esistente per ' + dto.entityType);
    }

    const field = this.customFieldRepo.create({
      tenantId,
      createdBy: userId,
      entityType: dto.entityType,
      fieldName: dto.fieldName,
      fieldLabel: dto.fieldLabel,
      fieldType: dto.fieldType as FieldType,
      options: dto.options,
      validationRules: dto.validationRules,
      isRequired: dto.isRequired,
      defaultValue: dto.defaultValue,
      placeholder: dto.placeholder,
      helpText: dto.helpText,
      sortOrder: dto.sortOrder,
    });

    const saved = await this.customFieldRepo.save(field);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAllFields(tenantId: string, entityType?: string): Promise<CustomField[]> {
    const where: any = { tenantId, isActive: true };
    if (entityType) {
      where.entityType = entityType;
    }
    
    return this.customFieldRepo.find({
      where,
      order: { sortOrder: 'ASC', fieldLabel: 'ASC' },
    });
  }

  async findFieldById(tenantId: string, id: string): Promise<CustomField> {
    const field = await this.customFieldRepo.findOne({
      where: { id, tenantId },
    });

    if (!field) {
      throw new NotFoundException('Campo personalizzato non trovato');
    }

    return field;
  }

  async updateField(tenantId: string, id: string, dto: Partial<CreateCustomFieldDto>): Promise<CustomField> {
    const field = await this.findFieldById(tenantId, id);
    delete dto.entityType;
    delete dto.fieldName;
    
    Object.assign(field, dto);
    const saved = await this.customFieldRepo.save(field);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async deleteField(tenantId: string, id: string): Promise<void> {
    const field = await this.findFieldById(tenantId, id);
    field.isActive = false;
    await this.customFieldRepo.save(field);
  }

  async setFieldValue(
    tenantId: string,
    entityType: string,
    entityId: string,
    fieldId: string,
    value: any,
    userId: string,
  ): Promise<CustomFieldValue> {
    const field = await this.findFieldById(tenantId, fieldId);
    
    if (field.entityType !== entityType) {
      throw new BadRequestException('Il campo non appartiene a questa entita');
    }

    this.validateValue(field, value);

    let fieldValue = await this.customFieldValueRepo.findOne({
      where: {
        tenantId,
        customFieldId: fieldId,
        entityId,
      },
    });

    const valueData = this.formatValue(field.fieldType, value);

    if (fieldValue) {
      Object.assign(fieldValue, {
        ...valueData,
        updatedBy: userId,
      });
    } else {
      fieldValue = this.customFieldValueRepo.create({
        tenantId,
        customFieldId: fieldId,
        entityId,
        entityType,
        ...valueData,
        createdBy: userId,
      });
    }

    const saved = await this.customFieldValueRepo.save(fieldValue);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async getFieldValues(tenantId: string, entityType: string, entityId: string): Promise<any[]> {
    const values = await this.customFieldValueRepo.find({
      where: { tenantId, entityType, entityId },
      relations: ['customField'],
    });

    return values.map(v => ({
      fieldId: v.customFieldId,
      fieldName: v.customField.fieldName,
      fieldLabel: v.customField.fieldLabel,
      fieldType: v.customField.fieldType,
      value: this.extractValue(v),
    }));
  }

  private validateValue(field: CustomField, value: any): void {
    if (field.isRequired && (value === null || value === undefined || value === '')) {
      throw new BadRequestException('Il campo ' + field.fieldLabel + ' e obbligatorio');
    }

    if (!value) return;

    switch (field.fieldType) {
      case 'number':
      case 'currency':
        if (isNaN(Number(value))) {
          throw new BadRequestException('Il campo ' + field.fieldLabel + ' deve essere un numero');
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new BadRequestException('Email non valida');
        }
        break;
    }
  }

  private formatValue(fieldType: FieldType, value: any): Partial<CustomFieldValue> {
    switch (fieldType) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'url':
        return { valueText: value };
      case 'number':
      case 'currency':
        return { valueNumber: value };
      case 'boolean':
        return { valueBoolean: value };
      case 'date':
        return { valueDate: value };
      case 'datetime':
        return { valueDatetime: value };
      case 'multiselect':
        return { valueJson: value };
      default:
        return { valueText: String(value) };
    }
  }

  private extractValue(fieldValue: CustomFieldValue): any {
    if (fieldValue.valueText !== null) return fieldValue.valueText;
    if (fieldValue.valueNumber !== null) return fieldValue.valueNumber;
    if (fieldValue.valueBoolean !== null) return fieldValue.valueBoolean;
    if (fieldValue.valueDate !== null) return fieldValue.valueDate;
    if (fieldValue.valueDatetime !== null) return fieldValue.valueDatetime;
    if (fieldValue.valueJson !== null) return fieldValue.valueJson;
    return null;
  }
}
