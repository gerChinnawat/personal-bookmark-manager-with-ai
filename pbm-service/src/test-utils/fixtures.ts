import { Response } from 'express';

// Shared across *.spec.ts files so the sub-claim fixture format only needs
// to change in one place.
export const OWNER_ID = 'auth0|owner';
export const OTHER_ID = 'auth0|other';

export function makeRes(): Response {
  return { set: jest.fn() } as unknown as Response;
}
