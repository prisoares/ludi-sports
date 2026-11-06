import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AvailabilitySlotDto {
  /** Partner-web field. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  /** Phase 1b mobile alias for weekday. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  startMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  endMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  endMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;
}

export class SetAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}
