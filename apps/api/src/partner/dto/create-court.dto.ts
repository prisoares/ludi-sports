import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourtDto {
  /** Partner-web uses sportId; mobile Phase 1b uses sportSlug. */
  @IsOptional()
  @IsString()
  sportId?: string;

  @IsOptional()
  @IsString()
  sportSlug?: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
