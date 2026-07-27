import { BadRequestException } from '@nestjs/common';
import { decodeCursor, encodeCursor } from './cursor';

describe('cursor', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('round-trips a position through encode then decode', () => {
      const position = { createdAt: '2026-01-01T00:00:00.000Z', id: 'row-1' };

      const decoded = decodeCursor(encodeCursor(position));

      expect(decoded).toEqual(position);
    });
  });

  describe('decodeCursor', () => {
    // Buffer.from(str, 'base64') is lenient and never throws on invalid
    // characters, so this rejects via the same path as the malformed-JSON
    // cases below: the garbage decoded bytes fail JSON.parse.
    it('rejects a garbage string whose decoded bytes are not valid JSON', () => {
      expect(() => decodeCursor('not-a-valid-cursor!!!')).toThrow(
        new BadRequestException('Invalid cursor'),
      );
    });

    it('rejects a cursor missing createdAt', () => {
      const bad = Buffer.from(JSON.stringify({ id: 'row-1' }), 'utf8').toString(
        'base64',
      );

      expect(() => decodeCursor(bad)).toThrow(
        new BadRequestException('Invalid cursor'),
      );
    });

    it('rejects a cursor missing id', () => {
      const bad = Buffer.from(
        JSON.stringify({ createdAt: '2026-01-01T00:00:00.000Z' }),
        'utf8',
      ).toString('base64');

      expect(() => decodeCursor(bad)).toThrow(
        new BadRequestException('Invalid cursor'),
      );
    });

    it('rejects a cursor with an unparseable createdAt', () => {
      const bad = Buffer.from(
        JSON.stringify({ createdAt: 'not-a-date', id: 'row-1' }),
        'utf8',
      ).toString('base64');

      expect(() => decodeCursor(bad)).toThrow(
        new BadRequestException('Invalid cursor'),
      );
    });

    it('rejects a cursor whose payload is not an object', () => {
      const bad = Buffer.from(JSON.stringify('just a string'), 'utf8').toString(
        'base64',
      );

      expect(() => decodeCursor(bad)).toThrow(
        new BadRequestException('Invalid cursor'),
      );
    });
  });
});
