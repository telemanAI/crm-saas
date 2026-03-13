import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Custom Fields')
@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  @ApiOperation({ summary: 'Crea nuovo campo personalizzato' })
  create(@Body() dto: CreateCustomFieldDto, @Request() req) {
    return this.customFieldsService.createField(req.user.tenantId, dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lista campi personalizzati' })
  findAll(@Request() req, @Query('entityType') entityType?: string) {
    return this.customFieldsService.findAllFields(req.user.tenantId, entityType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Dettaglio campo' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.customFieldsService.findFieldById(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Aggiorna campo' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCustomFieldDto>, @Request() req) {
    return this.customFieldsService.updateField(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina campo (soft delete)' })
  remove(@Param('id') id: string, @Request() req) {
    return this.customFieldsService.deleteField(req.user.tenantId, id);
  }
}
