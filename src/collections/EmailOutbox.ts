import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/access'

const never = () => false

/** Durable transactional email jobs. Message content is encrypted and never API-readable. */
export const EmailOutbox: CollectionConfig = {
  slug: 'email-outbox',
  admin: {
    useAsTitle: 'eventKey',
    defaultColumns: ['eventType', 'status', 'attempts', 'nextAttemptAt', 'sentAt'],
    description: 'Delivery metadata only. Message content is encrypted and automatically scrubbed.',
    group: 'Admin',
  },
  access: { create: never, read: isAdmin, update: never, delete: never },
  hooks: {
    afterRead: [
      ({ doc }) => {
        delete doc.encryptedMessage
        return doc
      },
    ],
  },
  fields: [
    { name: 'eventKey', type: 'text', required: true, unique: true, index: true },
    {
      name: 'eventType', type: 'select', required: true, index: true,
      options: ['registration-confirmation', 'submission-receipt', 'magic-link', 'submission-decision', 'revision-request'],
    },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'pending', index: true,
      options: ['pending', 'processing', 'retrying', 'sent', 'failed', 'cancelled', 'ambiguous'],
    },
    { name: 'attempts', type: 'number', required: true, defaultValue: 0, min: 0, max: 6 },
    { name: 'nextAttemptAt', type: 'date', required: true, index: true },
    { name: 'leaseToken', type: 'text', admin: { hidden: true } },
    { name: 'leaseExpiresAt', type: 'date', index: true, admin: { hidden: true } },
    { name: 'providerIdempotencyKey', type: 'text', required: true, unique: true, admin: { hidden: true } },
    {
      name: 'encryptedMessage', type: 'textarea',
      access: { read: never, create: never, update: never }, admin: { hidden: true },
    },
    { name: 'messageExpiresAt', type: 'date', index: true, admin: { hidden: true } },
    { name: 'requiresMagicLink', type: 'checkbox', required: true, defaultValue: false, admin: { hidden: true } },
    { name: 'magicLink', type: 'relationship', relationTo: 'magic-links', admin: { hidden: true } },
    { name: 'firstAttemptAt', type: 'date' },
    { name: 'lastAttemptAt', type: 'date' },
    { name: 'sentAt', type: 'date' },
    { name: 'cancelledAt', type: 'date' },
    { name: 'providerMessageId', type: 'text' },
    { name: 'lastErrorCode', type: 'text' },
    { name: 'lastError', type: 'text' },
    { name: 'manualRetryAt', type: 'date' },
    { name: 'manualRetryBy', type: 'relationship', relationTo: 'users' },
    { name: 'manualRetryReason', type: 'textarea' },
  ],
  timestamps: true,
}
