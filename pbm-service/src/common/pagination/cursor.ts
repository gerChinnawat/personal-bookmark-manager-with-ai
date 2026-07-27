import { BadRequestException } from '@nestjs/common';

// Opaque cursor = base64 JSON of the keyset position of the last row in the
// previous page (API_DESIGN.md §5). Never validated against ownerId here:
// the caller re-applies the ownerId filter on every query, so a forged or
// foreign cursor can only reposition the caller within their own result set.
export interface CursorPosition {
  createdAt: string;
  id: string;
}

const INVALID_CURSOR_MESSAGE = 'Invalid cursor';

export function encodeCursor(position: CursorPosition): string {
  return Buffer.from(JSON.stringify(position), 'utf8').toString('base64');
}

export function decodeCursor(cursor: string): CursorPosition {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.id !== 'string' ||
      Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      throw new Error('malformed cursor payload');
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    throw new BadRequestException(INVALID_CURSOR_MESSAGE);
  }
}
