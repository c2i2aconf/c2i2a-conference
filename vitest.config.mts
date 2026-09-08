import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

import { loadAndActivateTestEnvironment } from './src/lib/test-environment'

loadAndActivateTestEnvironment()

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    // DB-backed suites share one isolated database and must not race their fixtures.
    fileParallelism: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    hookTimeout: 120000,
    testTimeout: 60000,
  },
})
