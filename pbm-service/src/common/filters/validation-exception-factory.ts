import { BadRequestException, ValidationError } from '@nestjs/common';

// class-validator's default flat message strings don't split into
// {field, issue} pairs. This factory does that split so the exception
// filter can populate `details` per API_DESIGN.md §6 without ever touching
// anything but the caller's own submitted field names/constraint text.
function flatten(
  errors: ValidationError[],
): { field: string; issue: string }[] {
  return errors.flatMap((error) => {
    const ownIssues = Object.values(error.constraints ?? {}).map((issue) => ({
      field: error.property,
      issue,
    }));
    const childIssues = error.children?.length ? flatten(error.children) : [];
    return [...ownIssues, ...childIssues];
  });
}

export const VALIDATION_FAILED_MESSAGE = 'Validation failed';

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    message: VALIDATION_FAILED_MESSAGE,
    details: flatten(errors),
  });
}
