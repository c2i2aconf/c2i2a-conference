import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { getFileKey } from '@payloadcms/plugin-cloud-storage/utilities'
import { BlobNotFoundError, del, get, put } from '@vercel/blob'
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'
import type { Plugin } from 'payload'

const CACHE_SECONDS = 60 * 60

function createPrivateAdapter(token: string): Adapter {
  return ({ prefix: collectionPrefix = '' }) => ({
    name: 'private-vercel-blob',
    generateURL: ({ filename, prefix: docPrefix }) => {
      const { fileKey } = getFileKey({ collectionPrefix, docPrefix, filename })
      const storeId = token.match(/^vercel_blob_rw_([a-z\d]+)_/i)?.[1]?.toLowerCase()
      return `https://${storeId}.private.blob.vercel-storage.com/${fileKey}`
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
        headers.set('Cache-Control', `private, max-age=${CACHE_SECONDS}`)
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
