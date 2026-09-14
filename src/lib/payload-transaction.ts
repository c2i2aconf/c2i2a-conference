import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
  type TypedUser,
} from 'payload'

export async function withPayloadTransaction<T>(
  payload: Payload,
  options: { headers?: Headers; user?: TypedUser | null },
  work: (req: PayloadRequest) => Promise<T>,
): Promise<T> {
  const req = await createLocalReq(
    { req: options.headers ? { headers: options.headers } : undefined, user: options.user ?? undefined },
    payload,
  )
  const started = await initTransaction(req)
  try {
    const result = await work(req)
    if (started) await commitTransaction(req)
    return result
  } catch (error) {
    if (started) await killTransaction(req)
    throw error
  }
}
