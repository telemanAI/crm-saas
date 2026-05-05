import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';
import { CustomField } from './entities/custom-field.entity';
import { CustomFieldValue } from './entities/custom-field-value.entity';
import { JWT_SECRET } from '../auth/jwt-config';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomField, CustomFieldValue]),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],  // ⭐ AGGIUNGI QUESTA LINEA
})
export class CustomFieldsModule {}