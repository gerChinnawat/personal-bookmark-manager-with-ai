import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

// javascript:/data:/file: schemes are rejected (API_DESIGN.md §3) — IsUrl's
// protocols allow-list is the enforcement point, not a regex.
const ALLOWED_URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
};

export class CreateBookmarkDto {
  @ApiProperty({ example: 'https://nestjs.com' })
  @IsUrl(ALLOWED_URL_OPTIONS)
  url: string;

  @ApiProperty({ example: 'NestJS docs', minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiPropertyOptional({ example: 'Reference for the module system' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Must belong to the caller.' })
  @IsOptional()
  @IsString()
  collectionId?: string;
}

export class UpdateBookmarkDto extends PartialType(CreateBookmarkDto) {}
