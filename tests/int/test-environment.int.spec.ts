import {
  assertSafeTestDatabase,
  assertTestEnvironment,
  getPayloadDatabaseUrl,
} from '@/lib/test-environment'
import { describe, expect, it } from 'vitest'

const developmentUrl = 'postgresql://user:secret@ep-development.neon.tech/conference'
const testUrl = 'postgresql://user:secret@ep-tests.neon.tech/conference'

describe('test database safety', () => {
  it('requires an explicit test database URL', () => {
    expect(() => assertSafeTestDatabase({ DATABASE_URL: developmentUrl })).toThrow(
      /TEST_DATABASE_URL is missing/,
    )
  })

  it('rejects an exact match with the normal database URL', () => {
    expect(() =>
      assertSafeTestDatabase({ DATABASE_URL: developmentUrl, TEST_DATABASE_URL: developmentUrl }),
    ).toThrow(/must not equal DATABASE_URL/)
  })

  it('rejects pooled and direct URLs that identify the same Neon database', () => {
    expect(() =>
      assertSafeTestDatabase({
        DATABASE_URL:
          'postgresql://app:normal@ep-shared-pooler.eu-central-1.aws.neon.tech/conference?sslmode=require',
        TEST_DATABASE_URL:
          'postgresql://tester:different@ep-shared.eu-central-1.aws.neon.tech/conference?sslmode=require',
      }),
    ).toThrow(/resolve to the same host and database/)
  })

  it('rejects malformed, placeholder, and production-environment configurations', () => {
    expect(() => assertSafeTestDatabase({ TEST_DATABASE_URL: 'not-a-url' })).toThrow(
      /valid PostgreSQL connection URL/,
    )
    expect(() =>
      assertSafeTestDatabase({
        TEST_DATABASE_URL: 'postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME',
      }),
    ).toThrow(/placeholder credentials/)
    expect(() =>
      assertSafeTestDatabase({ TEST_DATABASE_URL: testUrl, VERCEL_ENV: 'production' }),
    ).toThrow(/Vercel production environment/)
  })

  it('requires a test runtime before test-only mutation helpers can run', () => {
    expect(() =>
      assertTestEnvironment({ DATABASE_URL: developmentUrl, TEST_DATABASE_URL: testUrl }),
    ).toThrow(/PAYLOAD_TEST_ENV=true/)
  })

  it('selects TEST_DATABASE_URL only for tests', () => {
    expect(
      getPayloadDatabaseUrl({
        DATABASE_URL: developmentUrl,
        TEST_DATABASE_URL: testUrl,
        PAYLOAD_TEST_ENV: 'true',
      }),
    ).toBe(testUrl)
    expect(getPayloadDatabaseUrl({ DATABASE_URL: developmentUrl, TEST_DATABASE_URL: testUrl })).toBe(
      developmentUrl,
    )
  })
})
