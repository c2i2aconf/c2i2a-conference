import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

type MigrationDB = Pick<MigrateUpArgs['db'], 'execute'>

export async function upgradeEmailOutboxTokenMarker(db: MigrationDB): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_outbox" ADD COLUMN "requires_magic_link" boolean DEFAULT false NOT NULL;
   UPDATE "email_outbox"
      SET "requires_magic_link" = true
    WHERE "magic_link_id" IS NOT NULL
       OR "event_type" = 'magic-link'
       OR ("event_type" = 'registration-confirmation' AND "message_expires_at" IS NOT NULL);
   UPDATE "email_outbox" AS jobs
      SET "status" = 'cancelled',
          "cancelled_at" = clock_timestamp(),
          "encrypted_message" = NULL,
          "lease_token" = NULL,
          "lease_expires_at" = NULL,
          "updated_at" = clock_timestamp()
    WHERE jobs."requires_magic_link" = true
      AND jobs."encrypted_message" IS NOT NULL
      AND jobs."status" IN ('pending', 'retrying', 'processing', 'failed', 'ambiguous')
      AND NOT EXISTS (
        SELECT 1 FROM "magic_links"
         WHERE "magic_links"."id" = jobs."magic_link_id"
           AND "magic_links"."consumed_at" IS NULL
           AND "magic_links"."expires_at" > clock_timestamp()
      );`)
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await upgradeEmailOutboxTokenMarker(db)
}

export async function downgradeEmailOutboxTokenMarker(db: MigrationDB): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_outbox" DROP COLUMN "requires_magic_link";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await downgradeEmailOutboxTokenMarker(db)
}
