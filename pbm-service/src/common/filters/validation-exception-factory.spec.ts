import { ValidationError } from '@nestjs/common';
import {
  validationExceptionFactory,
  VALIDATION_FAILED_MESSAGE,
} from './validation-exception-factory';

function makeError(overrides: Partial<ValidationError>): ValidationError {
  return {
    property: 'field',
    constraints: {},
    children: [],
    ...overrides,
  } as ValidationError;
}

describe('validationExceptionFactory', () => {
  it('wraps flattened errors in a BadRequestException with the fixed message', () => {
    const errors = [
      makeError({
        property: 'name',
        constraints: { isLength: 'name must be longer than 1 characters' },
      }),
    ];

    const exception = validationExceptionFactory(errors);
    const body = exception.getResponse() as {
      message: string;
      details: unknown[];
    };

    expect(body.message).toBe(VALIDATION_FAILED_MESSAGE);
    expect(body.details).toEqual([
      { field: 'name', issue: 'name must be longer than 1 characters' },
    ]);
  });

  it('emits one entry per constraint on the same field', () => {
    const errors = [
      makeError({
        property: 'url',
        constraints: {
          isUrl: 'url must be a URL',
          isNotEmpty: 'url should not be empty',
        },
      }),
    ];

    const exception = validationExceptionFactory(errors);
    const body = exception.getResponse() as { details: unknown[] };

    expect(body.details).toHaveLength(2);
    expect(body.details).toEqual(
      expect.arrayContaining([
        { field: 'url', issue: 'url must be a URL' },
        { field: 'url', issue: 'url should not be empty' },
      ]),
    );
  });

  it('flattens nested children errors alongside the parent errors', () => {
    const errors = [
      makeError({
        property: 'parent',
        constraints: { isObject: 'parent must be an object' },
        children: [
          makeError({
            property: 'child',
            constraints: { isString: 'child must be a string' },
          }),
        ],
      }),
    ];

    const exception = validationExceptionFactory(errors);
    const body = exception.getResponse() as { details: unknown[] };

    expect(body.details).toEqual(
      expect.arrayContaining([
        { field: 'parent', issue: 'parent must be an object' },
        { field: 'child', issue: 'child must be a string' },
      ]),
    );
  });

  it('returns an empty details array for an empty error list', () => {
    const exception = validationExceptionFactory([]);
    const body = exception.getResponse() as { details: unknown[] };

    expect(body.details).toEqual([]);
  });
});
