import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// Allow-list only (API_DESIGN.md §5) — arbitrary column names are rejected,
// not silently ignored. createdAt is the only sortable field either model
// exposes today.
export const SORT_VALUES = ['createdAt:asc', 'createdAt:desc'] as const;
export type SortValue = (typeof SORT_VALUES)[number];
export const DEFAULT_SORT: SortValue = 'createdAt:desc';

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

export class ListQueryDto {
  // Values above MAX_LIMIT are rejected with 400, not clamped (API_DESIGN.md
  // §5) — silently reinterpreting a client's stated limit is the same class
  // of bug as silently dropping an unknown PUT/PATCH key.
  // Query params arrive as strings; @Type coerces before @IsInt/@Min/@Max
  // run, so a non-numeric or out-of-range value is rejected for the right
  // reason instead of failing @IsInt on a raw string.
  @ApiPropertyOptional({
    default: DEFAULT_LIMIT,
    maximum: MAX_LIMIT,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Opaque pagination cursor from X-Next-Cursor.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ enum: SORT_VALUES, default: DEFAULT_SORT })
  @IsOptional()
  @IsIn(SORT_VALUES)
  sort?: SortValue = DEFAULT_SORT;

  // Applies to every list route (API_DESIGN.md §5): substring match against
  // title+notes for bookmarks, name-only for collections (which have no
  // notes field) — see each repository's findAll for the field mapping.
  @ApiPropertyOptional({ description: 'Substring search.' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class BookmarkListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collectionId?: string;

  // Query-string "null" is ambiguous between the string "null" and "absent"
  // (API_DESIGN.md §5), so this is a separate boolean flag rather than
  // overloading collectionId=null.
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  uncategorised?: boolean;
}

// Used by GET /collections/:id/bookmarks: collectionId is fixed by the path
// param, and "uncategorised" is meaningless when a collection is already
// pinned, so neither is accepted here. q is inherited from ListQueryDto.
export class CollectionBookmarksQueryDto extends ListQueryDto {}
