/**
 * Database setup — patches pg.Pool to use Neon's WebSocket-based serverless driver.
 * This bypasses firewalls/ISPs that block outbound PostgreSQL on port 5432
 * by tunneling through WebSockets (port 443).
 *
 * MUST be imported before @payloadcms/db-postgres to take effect.
 */
import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless'
import pg from 'pg'
import ws from 'ws'

// Use the ws package for WebSocket connections (required in Node.js)
neonConfig.webSocketConstructor = ws

// Replace pg.Pool with Neon's WebSocket-based Pool
// NeonPool implements the same API as pg.Pool but connects via WSS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(pg as any).Pool = NeonPool

export {}
