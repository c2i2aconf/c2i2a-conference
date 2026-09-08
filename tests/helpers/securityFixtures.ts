import type { Payload } from 'payload'

type PublishedLiveEditionOptions = {
  title: string
  year: number
}

export async function createPublishedLiveEdition(
  payload: Payload,
  { title, year }: PublishedLiveEditionOptions,
) {
  return payload.create({
    collection: 'editions',
    data: {
      year,
      title,
      startDate: '2099-06-01T00:00:00.000Z',
      endDate: '2099-06-03T00:00:00.000Z',
      editionStatus: 'live',
      submissionsEnabled: true,
      submissionDeadline: '2099-05-01T00:00:00.000Z',
      _status: 'published',
    },
    draft: false,
    overrideAccess: true,
  })
}

/** A small, structurally valid one-page PDF for upload-boundary tests. */
export function createMinimalPDFBuffer(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream',
  ]
  let document = '%PDF-1.7\n'
  const offsets: number[] = []

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(document, 'latin1'))
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(document, 'latin1')
  document += `xref\n0 ${objects.length + 1}\n`
  document += '0000000000 65535 f \n'
  document += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  document += `startxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(document, 'latin1')
}
