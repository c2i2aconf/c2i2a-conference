import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_editions_conference_date_status" ADD VALUE 'provisional' BEFORE 'unresolved';
  ALTER TYPE "public"."enum__editions_v_version_conference_date_status" ADD VALUE 'provisional' BEFORE 'unresolved';
  ALTER TABLE "editions_locales" ADD COLUMN "conference_date_note" varchar;
  ALTER TABLE "_editions_v_locales" ADD COLUMN "version_conference_date_note" varchar;`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "editions" SET "conference_date_status" = 'unresolved' WHERE "conference_date_status" = 'provisional';
  UPDATE "_editions_v" SET "version_conference_date_status" = 'unresolved' WHERE "version_conference_date_status" = 'provisional';
  ALTER TABLE "editions" ALTER COLUMN "conference_date_status" SET DATA TYPE text;
  ALTER TABLE "editions" ALTER COLUMN "conference_date_status" SET DEFAULT 'confirmed'::text;
  DROP TYPE "public"."enum_editions_conference_date_status";
  CREATE TYPE "public"."enum_editions_conference_date_status" AS ENUM('confirmed', 'unresolved');
  ALTER TABLE "editions" ALTER COLUMN "conference_date_status" SET DEFAULT 'confirmed'::"public"."enum_editions_conference_date_status";
  ALTER TABLE "editions" ALTER COLUMN "conference_date_status" SET DATA TYPE "public"."enum_editions_conference_date_status" USING "conference_date_status"::"public"."enum_editions_conference_date_status";
  ALTER TABLE "_editions_v" ALTER COLUMN "version_conference_date_status" SET DATA TYPE text;
  ALTER TABLE "_editions_v" ALTER COLUMN "version_conference_date_status" SET DEFAULT 'confirmed'::text;
  DROP TYPE "public"."enum__editions_v_version_conference_date_status";
  CREATE TYPE "public"."enum__editions_v_version_conference_date_status" AS ENUM('confirmed', 'unresolved');
  ALTER TABLE "_editions_v" ALTER COLUMN "version_conference_date_status" SET DEFAULT 'confirmed'::"public"."enum__editions_v_version_conference_date_status";
  ALTER TABLE "_editions_v" ALTER COLUMN "version_conference_date_status" SET DATA TYPE "public"."enum__editions_v_version_conference_date_status" USING "version_conference_date_status"::"public"."enum__editions_v_version_conference_date_status";
  ALTER TABLE "editions_locales" DROP COLUMN "conference_date_note";
  ALTER TABLE "_editions_v_locales" DROP COLUMN "version_conference_date_note";`)
}
