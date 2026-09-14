import * as migration_20260820_211303_initial_schema from './20260820_211303_initial_schema';
import * as migration_20260910_004105_icaia_2027_content from './20260910_004105_icaia_2027_content';
import * as migration_20260910_145907_icaia_2027_provisional_date from './20260910_145907_icaia_2027_provisional_date';
import * as migration_20260910_171823_peer_review_workflow from './20260910_171823_peer_review_workflow';
import * as migration_20260911_141111_revision_camera_ready_workflow from './20260911_141111_revision_camera_ready_workflow';
import * as migration_20260912_115433_registration_payment_invitations from './20260912_115433_registration_payment_invitations';
import * as migration_20260913_194745_email_outbox from './20260913_194745_email_outbox';
import * as migration_20260914_101006_email_outbox_token_marker from './20260914_101006_email_outbox_token_marker';

export const migrations = [
  {
    up: migration_20260820_211303_initial_schema.up,
    down: migration_20260820_211303_initial_schema.down,
    name: '20260820_211303_initial_schema',
  },
  {
    up: migration_20260910_004105_icaia_2027_content.up,
    down: migration_20260910_004105_icaia_2027_content.down,
    name: '20260910_004105_icaia_2027_content',
  },
  {
    up: migration_20260910_145907_icaia_2027_provisional_date.up,
    down: migration_20260910_145907_icaia_2027_provisional_date.down,
    name: '20260910_145907_icaia_2027_provisional_date',
  },
  {
    up: migration_20260910_171823_peer_review_workflow.up,
    down: migration_20260910_171823_peer_review_workflow.down,
    name: '20260910_171823_peer_review_workflow',
  },
  {
    up: migration_20260911_141111_revision_camera_ready_workflow.up,
    down: migration_20260911_141111_revision_camera_ready_workflow.down,
    name: '20260911_141111_revision_camera_ready_workflow',
  },
  {
    up: migration_20260912_115433_registration_payment_invitations.up,
    down: migration_20260912_115433_registration_payment_invitations.down,
    name: '20260912_115433_registration_payment_invitations',
  },
  {
    up: migration_20260913_194745_email_outbox.up,
    down: migration_20260913_194745_email_outbox.down,
    name: '20260913_194745_email_outbox',
  },
  {
    up: migration_20260914_101006_email_outbox_token_marker.up,
    down: migration_20260914_101006_email_outbox_token_marker.down,
    name: '20260914_101006_email_outbox_token_marker'
  },
];
