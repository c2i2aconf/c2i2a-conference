import { config as loadEnvironmentFile } from 'dotenv'

const TEST_ENVIRONMENT_FLAG = 'PAYLOAD_TEST_ENV'
const ERROR_PREFIX = 'Unsafe test database configuration:'

type Environment = Record<string, string | undefined>

function fail(message: string): never {
  throw new Error(
    `${ERROR_PREFIX} ${message} Mutating tests require an explicit, isolated TEST_DATABASE_URL.`,
  )
}

function databaseIdentity(
  connectionString: string,
  variableName: string,
  required: boolean,
): string | null {
  let url: URL

  try {
    url = new URL(connectionString)
  } catch {
    if (required) fail(`${variableName} must be a valid PostgreSQL connection URL.`)
    return null
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    if (required) fail(`${variableName} must use the postgres:// or postgresql:// protocol.`)
    return null
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!url.hostname || !database) {
    if (required) fail(`${variableName} must include a database host and database name.`)
    return null
  }

  if (
    url.username === 'USER' ||
    url.password === 'PASSWORD' ||
    url.hostname.toLowerCase().startsWith('host.') ||
    database === 'DBNAME'
  ) {
    if (required) fail(`${variableName} still contains placeholder credentials.`)
    return null
  }

  // Neon direct and pooled URLs for one branch differ only by this suffix.
  // Treat them as the same database so changing connection options cannot
  // bypass the production/development database comparison.
  const hostname = url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '')
  const port = url.port || '5432'

  return `${hostname}:${port}/${database}`
}

export function isTestEnvironment(environment: Environment = process.env): boolean {
  return environment.NODE_ENV === 'test' || environment[TEST_ENVIRONMENT_FLAG] === 'true'
}

export function assertSafeTestDatabase(environment: Environment = process.env): string {
  if (
    environment.VERCEL_ENV?.toLowerCase() === 'production' ||
    environment.VERCEL_TARGET_ENV?.toLowerCase() === 'production'
  ) {
    fail('tests cannot run in a Vercel production environment.')
  }

  const testDatabaseUrl = environment.TEST_DATABASE_URL?.trim()
  if (!testDatabaseUrl) {
    fail('TEST_DATABASE_URL is missing.')
  }

  const testIdentity = databaseIdentity(testDatabaseUrl, 'TEST_DATABASE_URL', true)
  const databaseUrl = environment.DATABASE_URL?.trim()

  if (databaseUrl) {
    if (testDatabaseUrl === databaseUrl) {
      fail('TEST_DATABASE_URL must not equal DATABASE_URL.')
    }

    const databaseIdentityValue = databaseIdentity(databaseUrl, 'DATABASE_URL', false)
    if (databaseIdentityValue && testIdentity === databaseIdentityValue) {
      fail(
        'TEST_DATABASE_URL and DATABASE_URL resolve to the same host and database (including Neon pooled/direct variants).',
      )
    }
  }

  return testDatabaseUrl
}

export function loadAndActivateTestEnvironment(): string {
  // Match Next development precedence so DATABASE_URL in .env.local is also
  // part of the safety comparison. Existing process variables keep priority.
  loadEnvironmentFile({ path: '.env.local' })
  loadEnvironmentFile({ path: '.env' })
  process.env[TEST_ENVIRONMENT_FLAG] = 'true'
  return assertSafeTestDatabase()
}

export function assertTestEnvironment(environment: Environment = process.env): string {
  if (!isTestEnvironment(environment)) {
    fail(`${TEST_ENVIRONMENT_FLAG}=true (or NODE_ENV=test) is required.`)
  }

  return assertSafeTestDatabase(environment)
}

export function getPayloadDatabaseUrl(environment: Environment = process.env): string {
  if (isTestEnvironment(environment)) {
    return assertSafeTestDatabase(environment)
  }

  return environment.DATABASE_URL || ''
}
