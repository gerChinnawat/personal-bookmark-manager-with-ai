import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, KeyLike, SignJWT } from 'jose';
import * as request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { validationExceptionFactory } from '../src/common/filters/validation-exception-factory';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';

// The runnable proof for API_DESIGN.md §8: mints real RS256 tokens against a
// local JWKS (no live Auth0 dependency), then walks every registered route ×
// every auth state. Routes are enumerated from the Express router at runtime,
// so an endpoint added later is covered by the 401 sweep automatically — the
// route someone forgets to write a test for is exactly the one that leaks.

const ISSUER = 'https://dev-yg.us.auth0.com/';
const AUDIENCE = 'https://bbl-candidate-test-api';
// An ID token's aud is the Auth0 application's client_id (DECISIONS.md
// ADR-002) — minting a token with this aud simulates an ID token exactly.
const CLIENT_ID = 'H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA';

const USER_A = 'auth0|test-user-a';
const USER_B = 'auth0|test-user-b';

const PUBLIC_ROUTES = new Set(['GET /health']);

describe('Security matrix (e2e)', () => {
  let app: INestApplication;
  let jwksServer: Server;
  let privateKey: KeyLike;
  let rogueKey: KeyLike;

  const mint = (
    sub: string | undefined,
    {
      aud = [AUDIENCE, `${ISSUER}userinfo`],
      expiresIn = 3600,
      key = privateKey,
    }: { aud?: string | string[]; expiresIn?: number; key?: KeyLike } = {},
  ): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    const jwt = new SignJWT({ ...(sub ? { sub } : {}) })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setAudience(aud)
      .setIssuedAt(now - 60)
      .setExpirationTime(now + expiresIn);
    return jwt.sign(key);
  };

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    rogueKey = (await generateKeyPair('RS256')).privateKey;

    const jwk = {
      ...(await exportJWK(pair.publicKey)),
      kid: 'test-key',
      alg: 'RS256',
      use: 'sig',
    };
    jwksServer = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise<void>((r) => jwksServer.listen(0, () => r()));
    const { port } = jwksServer.address() as AddressInfo;

    process.env.AUTH0_ISSUER = ISSUER;
    process.env.AUTH0_AUDIENCE = AUDIENCE;
    process.env.AUTH0_JWKS_URI = `http://127.0.0.1:${port}/jwks.json`;

    // Imported only after the env is set: the guard reads its config at
    // construction and must see the local JWKS, never the live tenant.
    const { AppModule } = await import('../src/modules/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    // Mirror main.ts exactly — the matrix must exercise prod behaviour.
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => jwksServer?.close(r));
  });

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => `Bearer ${token}`;

  // Error bodies now carry a per-request requestId (API_DESIGN.md §6), so
  // "byte-identical" comparisons between two 404s must ignore that one
  // nondeterministic field rather than compare raw response text.
  const bodyIgnoringRequestId = (res: request.Response) => {
    const clone = JSON.parse(JSON.stringify(res.body));
    if (clone?.data?.requestId) delete clone.data.requestId;
    return clone;
  };

  /** Every route Nest registered, as "METHOD /path" + a requestable URL. */
  function registeredRoutes(): { key: string; method: string; url: string }[] {
    const instance = app.getHttpAdapter().getInstance();
    const router = instance.router ?? instance._router;
    const routes: { key: string; method: string; url: string }[] = [];
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const path: string = layer.route.path;
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({
          key: `${method.toUpperCase()} ${path}`,
          method: method.toLowerCase(),
          url: path.replace(/:[^/]+/g, 'nonexistent-id'),
        });
      }
    }
    return routes;
  }

  describe('401 sweep — every registered non-public route', () => {
    it('finds routes to sweep (self-check that enumeration works)', () => {
      const routes = registeredRoutes();
      expect(routes.length).toBeGreaterThanOrEqual(6);
      expect(routes.some((r) => r.key === 'GET /health')).toBe(true);
    });

    const authStates: [string, () => Promise<string | null>][] = [
      ['no token', async () => null],
      ['malformed token', async () => 'not-a-jwt'],
      ['expired token', () => mint(USER_A, { expiresIn: -3600 })],
      ['wrong signature', () => mint(USER_A, { key: rogueKey })],
      ['ID token (aud = client_id)', () => mint(USER_A, { aud: CLIENT_ID })],
      ['missing sub', () => mint(undefined)],
    ];

    it.each(authStates)(
      '%s → 401 on every protected route',
      async (_label, tokenFn) => {
        const token = await tokenFn();
        for (const route of registeredRoutes()) {
          if (PUBLIC_ROUTES.has(route.key)) continue;
          let req = (http() as any)[route.method](route.url);
          if (token) req = req.set('Authorization', auth(token));
          const res = await req;
          expect({ route: route.key, status: res.status }).toEqual({
            route: route.key,
            status: 401,
          });
        }
      },
    );
  });

  describe('public route', () => {
    it('GET /health → 200 with no token', async () => {
      await http()
        .get('/health')
        .expect(200, { status: true, message: 'OK', data: { status: 'ok' } });
    });
  });

  describe('cross-owner access — 404, byte-identical to nonexistent', () => {
    let tokenA: string;
    let tokenB: string;
    let collectionId: string;

    beforeAll(async () => {
      tokenA = await mint(USER_A);
      tokenB = await mint(USER_B);
      const res = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'matrix-fixture' })
        .expect(201);
      collectionId = res.body.data.id;
      expect(collectionId).toBeTruthy();
      expect(res.body.data.ownerId).toBeUndefined(); // never serialised (§3)
    });

    afterAll(async () => {
      await http()
        .delete(`/collections/${collectionId}`)
        .set('Authorization', auth(tokenA));
    });

    it('owner can read their own collection', async () => {
      await http()
        .get(`/collections/${collectionId}`)
        .set('Authorization', auth(tokenA))
        .expect(200);
    });

    const crossOwnerCases: [string, (id: string, t: string) => request.Test][] =
      [
        [
          'GET',
          (id, t) =>
            http().get(`/collections/${id}`).set('Authorization', auth(t)),
        ],
        [
          'PATCH',
          (id, t) =>
            http()
              .patch(`/collections/${id}`)
              .set('Authorization', auth(t))
              .send({ name: 'x' }),
        ],
        [
          'DELETE',
          (id, t) =>
            http().delete(`/collections/${id}`).set('Authorization', auth(t)),
        ],
      ];

    it.each(crossOwnerCases)(
      "%s: user B on user A's collection → 404 identical to nonexistent id",
      async (_verb, call) => {
        const crossOwner = await call(collectionId, tokenB);
        const nonexistent = await call('nonexistent-id', tokenB);
        expect(crossOwner.status).toBe(404);
        expect(nonexistent.status).toBe(404);
        // Identical bodies (ignoring the per-request requestId): cross-owner
        // must be indistinguishable from not-found (API_DESIGN.md §2 — no
        // existence oracle).
        expect(bodyIgnoringRequestId(crossOwner)).toEqual(
          bodyIgnoringRequestId(nonexistent),
        );
      },
    );

    it('ownerId in a request body → 400, never assigned (POST and PATCH)', async () => {
      await http()
        .post('/collections')
        .set('Authorization', auth(tokenB))
        .send({ name: 'spoof', ownerId: USER_A })
        .expect(400);
      await http()
        .patch(`/collections/${collectionId}`)
        .set('Authorization', auth(tokenA))
        .send({ ownerId: USER_B })
        .expect(400);
    });

    it("user B's list never contains user A's collection", async () => {
      const res = await http()
        .get('/collections')
        .set('Authorization', auth(tokenB))
        .expect(200);
      expect(res.body.data.map((c: { id: string }) => c.id)).not.toContain(
        collectionId,
      );
    });

    it('collection is intact after all cross-owner attempts', async () => {
      const res = await http()
        .get(`/collections/${collectionId}`)
        .set('Authorization', auth(tokenA))
        .expect(200);
      expect(res.body.data.name).toBe('matrix-fixture');
    });
  });

  describe('bookmarks — cross-owner access and collectionId ownership', () => {
    let tokenA: string;
    let tokenB: string;
    let collectionIdA: string;
    let bookmarkId: string;

    beforeAll(async () => {
      tokenA = await mint(USER_A);
      tokenB = await mint(USER_B);
      const collectionRes = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'bookmark-matrix-fixture' })
        .expect(201);
      collectionIdA = collectionRes.body.data.id;

      const bookmarkRes = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({ url: 'https://example.com', title: 'matrix-fixture' })
        .expect(201);
      bookmarkId = bookmarkRes.body.data.id;
      expect(bookmarkRes.body.data.ownerId).toBeUndefined(); // never serialised (§3)
    });

    afterAll(async () => {
      await http()
        .delete(`/bookmarks/${bookmarkId}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/collections/${collectionIdA}`)
        .set('Authorization', auth(tokenA));
    });

    it('owner can read their own bookmark', async () => {
      await http()
        .get(`/bookmarks/${bookmarkId}`)
        .set('Authorization', auth(tokenA))
        .expect(200);
    });

    const crossOwnerCases: [string, (id: string, t: string) => request.Test][] =
      [
        [
          'GET',
          (id, t) =>
            http().get(`/bookmarks/${id}`).set('Authorization', auth(t)),
        ],
        [
          'PATCH',
          (id, t) =>
            http()
              .patch(`/bookmarks/${id}`)
              .set('Authorization', auth(t))
              .send({ title: 'x' }),
        ],
        [
          'DELETE',
          (id, t) =>
            http().delete(`/bookmarks/${id}`).set('Authorization', auth(t)),
        ],
      ];

    it.each(crossOwnerCases)(
      "%s: user B on user A's bookmark → 404 identical to nonexistent id",
      async (_verb, call) => {
        const crossOwner = await call(bookmarkId, tokenB);
        const nonexistent = await call('nonexistent-id', tokenB);
        expect(crossOwner.status).toBe(404);
        expect(nonexistent.status).toBe(404);
        expect(bodyIgnoringRequestId(crossOwner)).toEqual(
          bodyIgnoringRequestId(nonexistent),
        );
      },
    );

    it('ownerId in a request body → 400, never assigned (POST and PATCH)', async () => {
      await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenB))
        .send({ url: 'https://example.com', title: 'spoof', ownerId: USER_A })
        .expect(400);
      await http()
        .patch(`/bookmarks/${bookmarkId}`)
        .set('Authorization', auth(tokenA))
        .send({ ownerId: USER_B })
        .expect(400);
    });

    it("user B's list never contains user A's bookmark", async () => {
      const res = await http()
        .get('/bookmarks')
        .set('Authorization', auth(tokenB))
        .expect(200);
      expect(res.body.data.map((b: { id: string }) => b.id)).not.toContain(
        bookmarkId,
      );
    });

    // CLAUDE.md rule 5 / API_DESIGN.md §4: a write that references another
    // row (here, collectionId) must independently check ownership of that
    // row too, not just the row being written.
    it("POST /bookmarks with user A's collectionId as user B → 404, not assigned", async () => {
      await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenB))
        .send({
          url: 'https://example.com',
          title: 'cross-collection',
          collectionId: collectionIdA,
        })
        .expect(404);
    });

    it("PATCH /bookmarks/:id reassigning to user A's collectionId as user B → 404", async () => {
      const ownRes = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenB))
        .send({ url: 'https://example.com', title: 'user-b-bookmark' })
        .expect(201);
      await http()
        .patch(`/bookmarks/${ownRes.body.data.id}`)
        .set('Authorization', auth(tokenB))
        .send({ collectionId: collectionIdA })
        .expect(404);
      await http()
        .delete(`/bookmarks/${ownRes.body.data.id}`)
        .set('Authorization', auth(tokenB));
    });

    it('rejects non-http(s) url schemes with 400', async () => {
      await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({ url: 'javascript:alert(1)', title: 'xss' })
        .expect(400);
    });

    it('bookmark is intact after all cross-owner attempts', async () => {
      const res = await http()
        .get(`/bookmarks/${bookmarkId}`)
        .set('Authorization', auth(tokenA))
        .expect(200);
      expect(res.body.data.title).toBe('matrix-fixture');
    });
  });

  describe('PUT — full replace semantics', () => {
    let tokenA: string;

    beforeAll(async () => {
      tokenA = await mint(USER_A);
    });

    it('PUT /collections/:id replaces name; omitting it is a validation failure', async () => {
      const created = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'put-original' })
        .expect(201);

      await http()
        .put(`/collections/${created.body.data.id}`)
        .set('Authorization', auth(tokenA))
        .send({ name: 'put-replaced' })
        .expect(200);
      const fetched = await http()
        .get(`/collections/${created.body.data.id}`)
        .set('Authorization', auth(tokenA))
        .expect(200);
      expect(fetched.body.data.name).toBe('put-replaced');

      await http()
        .put(`/collections/${created.body.data.id}`)
        .set('Authorization', auth(tokenA))
        .send({})
        .expect(400);

      await http()
        .delete(`/collections/${created.body.data.id}`)
        .set('Authorization', auth(tokenA));
    });

    it('PUT /bookmarks/:id nulls omitted optional fields (notes, collectionId) — unlike PATCH', async () => {
      const collection = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'put-bookmark-fixture' })
        .expect(201);
      const created = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({
          url: 'https://example.com',
          title: 'put-original',
          notes: 'a note',
          collectionId: collection.body.data.id,
        })
        .expect(201);
      expect(created.body.data.notes).toBe('a note');
      expect(created.body.data.collectionId).toBe(collection.body.data.id);

      const replaced = await http()
        .put(`/bookmarks/${created.body.data.id}`)
        .set('Authorization', auth(tokenA))
        .send({ url: 'https://example.com/replaced', title: 'put-replaced' })
        .expect(200);
      expect(replaced.body.data.url).toBe('https://example.com/replaced');
      expect(replaced.body.data.notes).toBeNull();
      expect(replaced.body.data.collectionId).toBeNull();

      await http()
        .delete(`/bookmarks/${created.body.data.id}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/collections/${collection.body.data.id}`)
        .set('Authorization', auth(tokenA));
    });

    it('PUT /bookmarks/:id rejects a missing required field (url) with 400', async () => {
      const created = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({ url: 'https://example.com', title: 'put-required-check' })
        .expect(201);

      await http()
        .put(`/bookmarks/${created.body.data.id}`)
        .set('Authorization', auth(tokenA))
        .send({ title: 'missing url' })
        .expect(400);

      await http()
        .delete(`/bookmarks/${created.body.data.id}`)
        .set('Authorization', auth(tokenA));
    });

    it("PUT /bookmarks/:id re-validates a reassigned collectionId's owner → 404", async () => {
      const tokenB = await mint(USER_B);
      const foreignCollection = await http()
        .post('/collections')
        .set('Authorization', auth(tokenB))
        .send({ name: 'put-foreign-collection' })
        .expect(201);
      const bookmark = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({ url: 'https://example.com', title: 'put-cross-collection' })
        .expect(201);

      await http()
        .put(`/bookmarks/${bookmark.body.data.id}`)
        .set('Authorization', auth(tokenA))
        .send({
          url: 'https://example.com',
          title: 'put-cross-collection',
          collectionId: foreignCollection.body.data.id,
        })
        .expect(404);

      await http()
        .delete(`/bookmarks/${bookmark.body.data.id}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/collections/${foreignCollection.body.data.id}`)
        .set('Authorization', auth(tokenB));
    });
  });

  describe('GET /me', () => {
    it('returns claims from the verified token, not a DB lookup', async () => {
      const token = await mint(USER_A);
      const res = await http()
        .get('/me')
        .set('Authorization', auth(token))
        .expect(200);
      expect(res.body.data.sub).toBe(USER_A);
    });
  });

  describe('GET /collections/:id/bookmarks', () => {
    let tokenA: string;
    let tokenB: string;
    let collectionId: string;
    let bookmarkId: string;

    beforeAll(async () => {
      tokenA = await mint(USER_A);
      tokenB = await mint(USER_B);
      const collection = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'nested-fixture' })
        .expect(201);
      collectionId = collection.body.data.id;
      const bookmark = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({
          url: 'https://example.com',
          title: 'nested-bookmark',
          collectionId,
        })
        .expect(201);
      bookmarkId = bookmark.body.data.id;
    });

    afterAll(async () => {
      await http()
        .delete(`/bookmarks/${bookmarkId}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/collections/${collectionId}`)
        .set('Authorization', auth(tokenA));
    });

    it('owner sees the bookmark scoped to the collection', async () => {
      const res = await http()
        .get(`/collections/${collectionId}/bookmarks`)
        .set('Authorization', auth(tokenA))
        .expect(200);
      expect(res.body.data.map((b: { id: string }) => b.id)).toContain(bookmarkId);
    });

    it("404 when the collection isn't the caller's — not an empty list", async () => {
      await http()
        .get(`/collections/${collectionId}/bookmarks`)
        .set('Authorization', auth(tokenB))
        .expect(404);
    });

    it('cross-owner 404 is identical to a nonexistent collection id', async () => {
      const crossOwner = await http()
        .get(`/collections/${collectionId}/bookmarks`)
        .set('Authorization', auth(tokenB));
      const nonexistent = await http()
        .get('/collections/nonexistent-id/bookmarks')
        .set('Authorization', auth(tokenB));
      expect(crossOwner.status).toBe(404);
      expect(nonexistent.status).toBe(404);
      expect(bodyIgnoringRequestId(crossOwner)).toEqual(
        bodyIgnoringRequestId(nonexistent),
      );
    });
  });

  describe('list query params', () => {
    let tokenA: string;

    beforeAll(async () => {
      tokenA = await mint(USER_A);
    });

    it('limit above 100 is rejected with 400, not clamped', async () => {
      await http()
        .get('/bookmarks?limit=101')
        .set('Authorization', auth(tokenA))
        .expect(400);
    });

    it('an unparsable cursor is rejected with 400', async () => {
      await http()
        .get('/bookmarks?cursor=not-valid-base64-json')
        .set('Authorization', auth(tokenA))
        .expect(400);
    });

    it('an unknown sort value is rejected with 400 (allow-list only)', async () => {
      await http()
        .get('/bookmarks?sort=title:asc')
        .set('Authorization', auth(tokenA))
        .expect(400);
    });

    it('cursor pagination walks the full result set exactly once per row', async () => {
      const titles = ['cursor-page-a', 'cursor-page-b', 'cursor-page-c'];
      const created: string[] = [];
      for (const title of titles) {
        const res = await http()
          .post('/bookmarks')
          .set('Authorization', auth(tokenA))
          .send({ url: 'https://example.com', title })
          .expect(201);
        created.push(res.body.data.id);
      }

      const seen: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < titles.length; i++) {
        const req = http()
          .get('/bookmarks')
          .query({
            limit: 1,
            sort: 'createdAt:asc',
            ...(cursor ? { cursor } : {}),
          })
          .set('Authorization', auth(tokenA));
        const res = await req.expect(200);
        expect(res.body.data.length).toBe(1);
        seen.push(res.body.data[0].id);
        cursor = res.headers['x-next-cursor'];
      }
      for (const id of created) expect(seen).toContain(id);

      for (const id of created) {
        await http()
          .delete(`/bookmarks/${id}`)
          .set('Authorization', auth(tokenA));
      }
    });

    it('uncategorised=true returns only bookmarks with no collection', async () => {
      const collection = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'uncategorised-fixture-collection' })
        .expect(201);
      const categorised = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({
          url: 'https://example.com',
          title: 'categorised-bookmark',
          collectionId: collection.body.data.id,
        })
        .expect(201);
      const uncategorised = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({ url: 'https://example.com', title: 'uncategorised-bookmark' })
        .expect(201);

      const res = await http()
        .get('/bookmarks?uncategorised=true')
        .set('Authorization', auth(tokenA))
        .expect(200);
      const ids = res.body.data.map((b: { id: string }) => b.id);
      expect(ids).toContain(uncategorised.body.data.id);
      expect(ids).not.toContain(categorised.body.data.id);

      await http()
        .delete(`/bookmarks/${categorised.body.data.id}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/bookmarks/${uncategorised.body.data.id}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/collections/${collection.body.data.id}`)
        .set('Authorization', auth(tokenA));
    });

    it('q matches title/notes case-insensitively', async () => {
      const match = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({
          url: 'https://example.com',
          title: 'Distinctive Search Target',
        })
        .expect(201);
      const noMatch = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({ url: 'https://example.com', title: 'unrelated bookmark' })
        .expect(201);

      const res = await http()
        .get('/bookmarks')
        .query({ q: 'distinctive search' })
        .set('Authorization', auth(tokenA))
        .expect(200);
      const ids = res.body.data.map((b: { id: string }) => b.id);
      expect(ids).toContain(match.body.data.id);
      expect(ids).not.toContain(noMatch.body.data.id);

      await http()
        .delete(`/bookmarks/${match.body.data.id}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/bookmarks/${noMatch.body.data.id}`)
        .set('Authorization', auth(tokenA));
    });

    it('q on GET /collections matches name only (no notes field to search)', async () => {
      const match = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'Distinctive Collection Name' })
        .expect(201);
      const noMatch = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'unrelated collection' })
        .expect(201);

      const res = await http()
        .get('/collections')
        .query({ q: 'distinctive collection' })
        .set('Authorization', auth(tokenA))
        .expect(200);
      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(match.body.data.id);
      expect(ids).not.toContain(noMatch.body.data.id);

      await http()
        .delete(`/collections/${match.body.data.id}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/collections/${noMatch.body.data.id}`)
        .set('Authorization', auth(tokenA));
    });

    it('collectionId filter scopes to that collection, and 404s if not owned', async () => {
      const tokenB = await mint(USER_B);
      const collection = await http()
        .post('/collections')
        .set('Authorization', auth(tokenA))
        .send({ name: 'collectionId-filter-fixture' })
        .expect(201);
      const bookmark = await http()
        .post('/bookmarks')
        .set('Authorization', auth(tokenA))
        .send({
          url: 'https://example.com',
          title: 'collectionId-filter-bookmark',
          collectionId: collection.body.data.id,
        })
        .expect(201);

      const res = await http()
        .get('/bookmarks')
        .query({ collectionId: collection.body.data.id })
        .set('Authorization', auth(tokenA))
        .expect(200);
      expect(res.body.data.map((b: { id: string }) => b.id)).toContain(
        bookmark.body.data.id,
      );

      await http()
        .get('/bookmarks')
        .query({ collectionId: collection.body.data.id })
        .set('Authorization', auth(tokenB))
        .expect(404);

      await http()
        .delete(`/bookmarks/${bookmark.body.data.id}`)
        .set('Authorization', auth(tokenA));
      await http()
        .delete(`/collections/${collection.body.data.id}`)
        .set('Authorization', auth(tokenA));
    });
  });
});
