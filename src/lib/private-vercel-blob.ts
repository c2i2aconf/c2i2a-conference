import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { getFileKey } from '@payloadcms/plugin-cloud-storage/utilities'
import { BlobNotFoundError, del, get, put } from '@vercel/blob'
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'
import type { Plugin } from 'payload'

const CACHE_SECONDS = 60 * 60

function createPrivateAdapter(token: string): Adapter {
  return ({ collection, prefix: collectionPrefix = '' }) => ({
    name: 'private-vercel-blob',
    // Blobs are private; the public URL points at Payload's static file
    // route so every request goes through collection access control (and
    // next/image only ever sees same-origin /api/media/file/... paths)
    generateURL: ({ filename, prefix: docPrefix }) => {
      const prefixPart = docPrefix ? `${docPrefix}/` : ''
      return `/api/${collection.slug}/file/${prefixPart}${filename}`
    },
    handleUpload: async ({ data, file }) => {
      const { fileKey } = getFileKey({
        collectionPrefix,
        docPrefix: data.prefix,
        filename: file.filename,
      })
      await put(fileKey, file.buffer, {
        access: 'private',
        allowOverwrite: true,
        cacheControlMaxAge: CACHE_SECONDS,
        contentType: file.mimeType,
        token,
      })
      return data
    },
    handleDelete: async ({ doc, filename }) => {
      const { fileKey } = getFileKey({
        collectionPrefix,
        docPrefix: doc.prefix,
        filename,
      })
      await del(fileKey, { token })
    },
    staticHandler: async (req, { headers: incomingHeaders, params }) => {
      const { fileKey } = getFileKey({
        collectionPrefix,
        docPrefix: params.prefix,
        filename: params.filename,
      })

      try {
        const result = await get(fileKey, {
          access: 'private',
          token,
          headers: {
            ...(req.headers.get('if-none-match')
              ? { 'if-none-match': req.headers.get('if-none-match') as string }
              : {}),
          },
        })
        if (!result) return new Response(null, { status: 404 })

        const headers = new Headers(incomingHeaders)
        // Media is publicly readable, so its responses can be shared-cached;
        // submission files must stay private to the requester
        const visibility = params.collection === 'media' ? 'public' : 'private'
        headers.set('Cache-Control', `${visibility}, max-age=${CACHE_SECONDS}`)
        headers.set('Content-Disposition', result.blob.contentDisposition)
        headers.set('ETag', result.blob.etag)
        if (result.statusCode === 304) return new Response(null, { headers, status: 304 })
        headers.set('Content-Type', result.blob.contentType)
        headers.set('Content-Length', String(result.blob.size))
        if (result.blob.contentType === 'image/svg+xml') {
          headers.set('Content-Security-Policy', "script-src 'none'")
        }
        return new Response(result.stream, { headers })
      } catch (error) {
        if (error instanceof BlobNotFoundError) return new Response(null, { status: 404 })
        req.payload.logger.error({ err: error }, 'Private blob retrieval failed')
        return new Response('Internal Server Error', { status: 500 })
      }
    },
  })
}

/** Local uploads in development; private durable Vercel Blob storage in production. */
export function privateVercelBlobStorage(token: string | undefined): Plugin {
  const adapter = token ? createPrivateAdapter(token) : null
  return cloudStoragePlugin({
    alwaysInsertFields: true,
    enabled: Boolean(token),
    collections: {
      media: { adapter, disableLocalStorage: Boolean(token), prefix: 'media' },
      'submission-files': {
        adapter,
        disableLocalStorage: Boolean(token),
        prefix: 'submissions',
      },
    },
  })
}
