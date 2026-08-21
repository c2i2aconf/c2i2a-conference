import type { CollectionConfig } from 'payload'

import { canAccessAdmin, isAdmin, isAdminField, isAdminOrOwnUser } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Admin',
  },
  auth: true,
  access: {
    admin: canAccessAdmin,
    // First user can be created via /admin/create-first-user; afterwards only admins create users
    create: isAdmin,
    read: isAdminOrOwnUser,
    update: isAdminOrOwnUser,
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text' },
        { name: 'lastName', type: 'text' },
      ],
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'attendee',
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor (content manager)', value: 'editor' },
        { label: 'Reviewer', value: 'reviewer' },
        { label: 'Author', value: 'author' },
        { label: 'Attendee', value: 'attendee' },
      ],
      access: {
        // Only admins can change roles
        create: isAdminField,
        update: isAdminField,
      },
    },
    { name: 'affiliation', type: 'text' },
    { name: 'country', type: 'text' },
  ],
}
