import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DetectedProductPatchItem {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsBoolean()
  isEdited?: boolean;
}

export class UpdateDetectedProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetectedProductPatchItem)
  items: DetectedProductPatchItem[];
}
