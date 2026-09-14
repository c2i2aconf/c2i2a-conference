import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_email_outbox_event_type" AS ENUM('registration-confirmation', 'submission-receipt', 'magic-link', 'submission-decision', 'revision-request');
  CREATE TYPE "public"."enum_email_outbox_status" AS ENUM('pending', 'processing', 'retrying', 'sent', 'failed', 'cancelled', 'ambiguous');
  CREATE TABLE "email_outbox" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_key" varchar NOT NULL,
  	"event_type" "enum_email_outbox_event_type" NOT NULL,
  	"status" "enum_email_outbox_status" DEFAULT 'pending' NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"next_attempt_at" timestamp(3) with time zone NOT NULL,
  	"lease_token" varchar,
  	"lease_expires_at" timestamp(3) with time zone,
  	"provider_idempotency_key" varchar NOT NULL,
  	"encrypted_message" varchar,
  	"message_expires_at" timestamp(3) with time zone,
  	"magic_link_id" integer,
  	"first_attempt_at" timestamp(3) with time zone,
  	"last_attempt_at" timestamp(3) with time zone,
  	"sent_at" timestamp(3) with time zone,
  	"cancelled_at" timestamp(3) with time zone,
  	"provider_message_id" varchar,
  	"last_error_code" varchar,
  	"last_error" varchar,
  	"manual_retry_at" timestamp(3) with time zone,
  	"manual_retry_by_id" integer,
  	"manual_retry_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "email_outbox_id" integer;
  ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_magic_link_id_magic_links_id_fk" FOREIGN KEY ("magic_link_id") REFERENCES "public"."magic_links"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_manual_retry_by_id_users_id_fk" FOREIGN KEY ("manual_retry_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "email_outbox_event_key_idx" ON "email_outbox" USING btree ("event_key");
  CREATE INDEX "email_outbox_event_type_idx" ON "email_outbox" USING btree ("event_type");
  CREATE INDEX "email_outbox_status_idx" ON "email_outbox" USING btree ("status");
  CREATE INDEX "email_outbox_next_attempt_at_idx" ON "email_outbox" USING btree ("next_attempt_at");
  CREATE INDEX "email_outbox_lease_expires_at_idx" ON "email_outbox" USING btree ("lease_expires_at");
  CREATE UNIQUE INDEX "email_outbox_provider_idempotency_key_idx" ON "email_outbox" USING btree ("provider_idempotency_key");
  CREATE INDEX "email_outbox_message_expires_at_idx" ON "email_outbox" USING btree ("message_expires_at");
  CREATE INDEX "email_outbox_magic_link_idx" ON "email_outbox" USING btree ("magic_link_id");
  CREATE INDEX "email_outbox_manual_retry_by_idx" ON "email_outbox" USING btree ("manual_retry_by_id");
  CREATE INDEX "email_outbox_updated_at_idx" ON "email_outbox" USING btree ("updated_at");
  CREATE INDEX "email_outbox_created_at_idx" ON "email_outbox" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_email_outbox_fk" FOREIGN KEY ("email_outbox_id") REFERENCES "public"."email_outbox"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_email_outbox_id_idx" ON "payload_locked_documents_rels" USING btree ("email_outbox_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_outbox" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_email_outbox_fk";
  DROP INDEX "payload_locked_documents_rels_email_outbox_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "email_outbox_id";
  DROP TABLE "email_outbox" CASCADE;
  DROP TYPE "public"."enum_email_outbox_event_type";
  DROP TYPE "public"."enum_email_outbox_status";`)
}
