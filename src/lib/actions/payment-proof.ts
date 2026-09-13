'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isPortalRole } from '../workflow-policy'
import { PROOF_FILE_LIMIT } from '../registration-workflow'

export async function uploadPaymentProof(form: FormData, locale: 'fr' | 'en') {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    const file = form.get('file')
    if (
      !user ||
      !isPortalRole(user.role) ||
      !(file instanceof File) ||
      file.size > PROOF_FILE_LIMIT
    )
      return false
    await payload.create({
      collection: 'payment-proofs',
      data: {
        registration: Number(form.get('registration')),
        user: user.id,
        edition: Number(form.get('edition')),
        sequence: 1,
        status: 'submitted',
      },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
      user,
      overrideAccess: false,
    })
    revalidatePath(`/${locale}/account`)
    return true
  } catch {
    return false
  }
}
