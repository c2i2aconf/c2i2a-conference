import { loadAndActivateTestEnvironment } from './src/lib/test-environment'

// Re-assert in every worker before any test module can import Payload.
loadAndActivateTestEnvironment()
