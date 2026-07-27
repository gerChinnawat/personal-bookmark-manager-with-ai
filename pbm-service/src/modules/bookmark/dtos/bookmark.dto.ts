import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

// javascript:/data:/file: schemes are rejected (API_DESIGN.md §3) — IsUrl's
// protocols allow-list is the enforcement point, not a regex.
const ALLOWED_URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
};

export class CreateBookmarkDto {
  @IsUrl(ALLOWED_URL_OPTIONS)
  url: string;

  @IsString()
  @Length(1, 200)
  title: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  collectionId?: string;
}

export class UpdateBookmarkDto extends PartialType(CreateBookmarkDto) {}
