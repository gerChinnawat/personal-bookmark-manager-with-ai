import { MeController } from './me.controller';

describe('MeController', () => {
  const controller = new MeController();

  it('returns only sub, email, and name from the verified claims', () => {
    const result = controller.me({
      sub: 'auth0|user-a',
      email: 'a@example.com',
      name: 'User A',
      // Extra claims a real Auth0 token may carry should never leak through.
      iss: 'https://dev-test.us.auth0.com/',
      aud: 'https://bbl-candidate-test-api',
    } as any);

    expect(result).toEqual({
      sub: 'auth0|user-a',
      email: 'a@example.com',
      name: 'User A',
    });
  });

  it('passes through undefined email/name rather than inventing values', () => {
    const result = controller.me({ sub: 'auth0|user-a' } as any);

    // Object.keys check first: toEqual alone can't tell "key present with an
    // undefined value" apart from "key absent entirely" (Jest treats both as
    // equal), so this pins down the actual shape before checking the values.
    expect(Object.keys(result).sort()).toEqual(['email', 'name', 'sub']);
    expect(result).toEqual({
      sub: 'auth0|user-a',
      email: undefined,
      name: undefined,
    });
  });
});
