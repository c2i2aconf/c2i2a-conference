/**
 * CI migration runner.
 *
 * Payload's `migrate` command interactively prompts when it detects a dev-mode
 * schema push (a `payload_migrations` record with `batch = -1`). That prompt
 * cannot be answered in Vercel's non-interactive build environment, so the
 * deployment stalls. This wrapper feeds a single `y` to the prompt so the
 * migration can proceed unattended.
 */
import { spawn } from 'node:child_process'

async function runMigrate(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'payload', '--', 'migrate'], {
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true,
    })

    // Answer Payload's "dev mode push" confirmation prompt.
    child.stdin?.write('y\n', (err) => {
      if (err) {
        // EPIPE is fine if no prompt was shown; anything else is unexpected.
        if ((err as NodeJS.ErrnoException).code !== 'EPIPE') {
          console.error('[migrate-ci] failed to write to stdin:', err)
        }
      }
      child.stdin?.end()
    })

    child.on('error', (err) => {
      console.error('[migrate-ci] failed to spawn migrate:', err)
      resolve(1)
    })

    child.on('close', (code) => {
      resolve(code ?? 0)
    })
  })
}

const code = await runMigrate()
process.exit(code)
