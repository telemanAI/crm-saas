import { IsOptional, IsString, IsObject, IsInt, Min, Max } from 'class-validator';

export class UpdateStepDto {
  // ===== SPRINT FIX — stepNumber reso OPZIONALE per supportare la "modifica
  // veloce" dal dettaglio pratica ([id].tsx) che non vuole alterare lo
  // stato dello stepper (currentStep / completedSteps). Quando assente o 0
  // il service applica solo il branch stepKey e non tocca currentStep. =====
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  stepNumber?: number;

  @IsOptional()
  @IsString()
  stepKey?: string;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}
