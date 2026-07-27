import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Standalone script, not application code — it talks to PrismaClient
// directly rather than through the repository layer (CLAUDE.md rule 1 is
// about controllers/services in the running app).
//
// These owner ids are fabricated, following the same auth0|... shape used
// by test/security-matrix.e2e-spec.ts (USER_A/USER_B) — they don't
// correspond to a real Auth0 account. A real login (candidate@test.com,
// see scripts/get-token.mjs) has its own real `sub` and starts with an
// empty account by design; this data exists to exercise the schema,
// pagination, and the cross-owner isolation invariant, not to be browsed
// via a live token.
const OWNER_A = 'auth0|example-user-1';
const OWNER_B = 'auth0|example-user-2';

const prisma = new PrismaClient();

async function seedOwner(ownerId: string, label: string) {
  // Idempotent: safe to re-run without duplicating rows.
  await prisma.bookmark.deleteMany({ where: { ownerId } });
  await prisma.collection.deleteMany({ where: { ownerId } });

  const reading = await prisma.collection.create({
    data: { ownerId, name: `${label} — Reading list` },
  });
  const tools = await prisma.collection.create({
    data: { ownerId, name: `${label} — Tools` },
  });

  await prisma.bookmark.createMany({
    data: [
      {
        ownerId,
        collectionId: reading.id,
        url: 'https://nestjs.com',
        title: 'NestJS docs',
        notes: 'Framework reference',
      },
      {
        ownerId,
        collectionId: reading.id,
        url: 'https://www.prisma.io/docs',
        title: 'Prisma docs',
      },
      {
        ownerId,
        collectionId: tools.id,
        url: 'https://www.postgresql.org/docs/',
        title: 'Postgres docs',
      },
      {
        ownerId,
        collectionId: null,
        url: 'https://example.com',
        title: 'Uncategorised example',
        notes: 'Not attached to any collection',
      },
    ],
  });
}

async function main() {
  await seedOwner(OWNER_A, 'User A');
  await seedOwner(OWNER_B, 'User B');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
