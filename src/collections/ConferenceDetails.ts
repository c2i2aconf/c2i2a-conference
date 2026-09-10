import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '../hooks/revalidateSite'

export const ConferenceDetails: CollectionConfig = {
  slug: 'conference-details',
  admin: {
    useAsTitle: 'edition',
    group: 'Content',
  },
  hooks: {
    afterChange: [revalidateSiteAfterChange],
    afterDelete: [revalidateSiteAfterDelete],
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'edition',
      type: 'relationship',
      relationTo: 'editions',
      required: true,
      unique: true,
    },
    {
      name: 'contributionTypes',
      type: 'array',
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'label', type: 'text', required: true, localized: true },
      ],
    },
    {
      name: 'submissionLanguages',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'French', value: 'fr' },
        { label: 'English', value: 'en' },
        { label: 'Arabic', value: 'ar' },
      ],
    },
    { name: 'englishAbstractRequired', type: 'checkbox', defaultValue: false },
    {
      type: 'row',
      fields: [
        { name: 'extendedAbstractMinWords', type: 'number' },
        { name: 'extendedAbstractMaxWords', type: 'number' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'fullPaperMinPages', type: 'number' },
        { name: 'fullPaperMaxPages', type: 'number' },
      ],
    },
    {
      name: 'acceptedFormats',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'DOCX', value: 'docx' },
        { label: 'PDF', value: 'pdf' },
      ],
    },
    { name: 'anonymizedManuscriptRequired', type: 'checkbox', defaultValue: false },
    { name: 'separateAuthorCoverSheetRequired', type: 'checkbox', defaultValue: false },
    { name: 'reviewersPerSubmission', type: 'number' },
    { name: 'thirdReviewerOnDisagreement', type: 'checkbox', defaultValue: false },
    {
      name: 'decisionOutcomes',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Acceptance', value: 'acceptance' },
        { label: 'Conditional revision', value: 'conditional-revision' },
        { label: 'Rejection', value: 'rejection' },
      ],
    },
    { name: 'anonymizedReportsReturned', type: 'checkbox', defaultValue: false },
    { name: 'isbnProceedings', type: 'checkbox', defaultValue: false },
    { name: 'registrationRequired', type: 'checkbox', defaultValue: false },
    { name: 'paymentRequired', type: 'checkbox', defaultValue: false },
    { name: 'paymentProofRequired', type: 'checkbox', defaultValue: false },
    { name: 'invitationLettersAvailable', type: 'checkbox', defaultValue: false },
    {
      name: 'registrationFees',
      type: 'array',
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'label', type: 'text', required: true, localized: true },
        { name: 'amount', type: 'number' },
        {
          name: 'currency',
          type: 'select',
          options: [
            { label: 'MAD', value: 'MAD' },
            { label: 'EUR', value: 'EUR' },
          ],
        },
        { name: 'alternateAmount', type: 'number' },
        {
          name: 'alternateCurrency',
          type: 'select',
          options: [
            { label: 'MAD', value: 'MAD' },
            { label: 'EUR', value: 'EUR' },
          ],
        },
        { name: 'exempt', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
