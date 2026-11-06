import { IsString, MinLength } from 'class-validator';

export class AddPhotoDto {
  @IsString()
  @MinLength(8)
  url!: string;
}
