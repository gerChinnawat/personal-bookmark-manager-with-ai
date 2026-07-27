import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DEFAULT_LIMIT, ListQueryDto, MAX_LIMIT } from './list-query.dto';

// Query params arrive as strings over the wire, so these mimic that instead
// of constructing the DTO with an already-numeric limit.
describe('ListQueryDto', () => {
  it('accepts a limit at the MAX_LIMIT boundary', async () => {
    const dto = plainToInstance(ListQueryDto, { limit: String(MAX_LIMIT) });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects a limit above MAX_LIMIT with a validation error, not a silent clamp', async () => {
    const dto = plainToInstance(ListQueryDto, {
      limit: String(MAX_LIMIT + 1),
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('limit');
    expect(errors[0].constraints).toHaveProperty('max');
    // The DTO value itself is left as-is (CLAUDE.md rule 8 is enforced by
    // the pipe rejecting the request, not by the DTO reinterpreting it).
    expect(dto.limit).toBe(MAX_LIMIT + 1);
  });

  it('defaults limit to DEFAULT_LIMIT when omitted', async () => {
    const dto = plainToInstance(ListQueryDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(DEFAULT_LIMIT);
  });
});
