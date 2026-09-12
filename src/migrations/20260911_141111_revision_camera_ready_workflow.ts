import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_revision_rounds_status" AS ENUM('open', 'submitted', 'closed');
  CREATE TYPE "public"."enum__revision_rounds_v_version_status" AS ENUM('open', 'submitted', 'closed');
  CREATE TYPE "public"."enum_submission_files_kind" AS ENUM('original-review', 'revision', 'camera-ready');
  CREATE TABLE "revision_rounds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"edition_id" integer NOT NULL,
  	"submission_id" integer NOT NULL,
  	"round_number" numeric NOT NULL,
  	"requested_by_id" integer NOT NULL,
  	"requested_at" timestamp(3) with time zone NOT NULL,
  	"deadline" timestamp(3) with time zone,
  	"instructions" varchar NOT NULL,
  	"status" "enum_revision_rounds_status" DEFAULT 'open' NOT NULL,
  	"revised_manuscript_id" integer,
  	"resubmitted_at" timestamp(3) with time zone,
  	"round_key" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_revision_rounds_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_edition_id" integer NOT NULL,
  	"version_submission_id" integer NOT NULL,
  	"version_round_number" numeric NOT NULL,
  	"version_requested_by_id" integer NOT NULL,
  	"version_requested_at" timestamp(3) with time zone NOT NULL,
  	"version_deadline" timestamp(3) with time zone,
  	"version_instructions" varchar NOT NULL,
  	"version_status" "enum__revision_rounds_v_version_status" DEFAULT 'open' NOT NULL,
  	"version_revised_manuscript_id" integer,
  	"version_resubmitted_at" timestamp(3) with time zone,
  	"version_round_key" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "submissions" ADD COLUMN "camera_ready_file_id" integer;
  ALTER TABLE "submissions" ADD COLUMN "camera_ready_submitted_at" timestamp(3) with time zone;
  ALTER TABLE "reviewer_assignments" ADD COLUMN "revision_round_id" integer;
  ALTER TABLE "reviewer_assignments" ADD COLUMN "released_to_author_at" timestamp(3) with time zone;
  ALTER TABLE "_reviewer_assignments_v" ADD COLUMN "version_revision_round_id" integer;
  ALTER TABLE "_reviewer_assignments_v" ADD COLUMN "version_released_to_author_at" timestamp(3) with time zone;
  ALTER TABLE "submission_files" ADD COLUMN "kind" "enum_submission_files_kind" DEFAULT 'original-review' NOT NULL;
  ALTER TABLE "submission_files" ADD COLUMN "submission_id" integer;
  ALTER TABLE "submission_files" ADD COLUMN "revision_round_id" integer;
  ALTER TABLE "submission_files" ADD COLUMN "stage_key" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "revision_rounds_id" integer;
  UPDATE "reviewer_assignments"
    SET "assignment_key" = "submission_id"::text || ':original:' || "reviewer_id"::text,
        "slot_key" = "submission_id"::text || ':original:' || "reviewer_number"::text;
  UPDATE "_reviewer_assignments_v"
    SET "version_assignment_key" = "version_submission_id"::text || ':original:' || "version_reviewer_id"::text,
        "version_slot_key" = "version_submission_id"::text || ':original:' || "version_reviewer_number"::text;
  UPDATE "reviewer_assignments" AS "assignment"
    SET "released_to_author_at" = COALESCE("assignment"."submitted_at", "assignment"."updated_at")
    FROM "submissions" AS "submission"
    WHERE "assignment"."submission_id" = "submission"."id"
      AND "assignment"."status" = 'completed'
      AND "submission"."status" IN ('revision-required', 'accepted', 'rejected');
  ALTER TABLE "revision_rounds" ADD CONSTRAINT "revision_rounds_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "revision_rounds" ADD CONSTRAINT "revision_rounds_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "revision_rounds" ADD CONSTRAINT "revision_rounds_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "revision_rounds" ADD CONSTRAINT "revision_rounds_revised_manuscript_id_submission_files_id_fk" FOREIGN KEY ("revised_manuscript_id") REFERENCES "public"."submission_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_revision_rounds_v" ADD CONSTRAINT "_revision_rounds_v_parent_id_revision_rounds_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."revision_rounds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_revision_rounds_v" ADD CONSTRAINT "_revision_rounds_v_version_edition_id_editions_id_fk" FOREIGN KEY ("version_edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_revision_rounds_v" ADD CONSTRAINT "_revision_rounds_v_version_submission_id_submissions_id_fk" FOREIGN KEY ("version_submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_revision_rounds_v" ADD CONSTRAINT "_revision_rounds_v_version_requested_by_id_users_id_fk" FOREIGN KEY ("version_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_revision_rounds_v" ADD CONSTRAINT "_revision_rounds_v_version_revised_manuscript_id_submission_files_id_fk" FOREIGN KEY ("version_revised_manuscript_id") REFERENCES "public"."submission_files"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "revision_rounds_edition_idx" ON "revision_rounds" USING btree ("edition_id");
  CREATE INDEX "revision_rounds_submission_idx" ON "revision_rounds" USING btree ("submission_id");
  CREATE INDEX "revision_rounds_requested_by_idx" ON "revision_rounds" USING btree ("requested_by_id");
  CREATE INDEX "revision_rounds_revised_manuscript_idx" ON "revision_rounds" USING btree ("revised_manuscript_id");
  CREATE UNIQUE INDEX "revision_rounds_round_key_idx" ON "revision_rounds" USING btree ("round_key");
  CREATE INDEX "revision_rounds_updated_at_idx" ON "revision_rounds" USING btree ("updated_at");
  CREATE INDEX "revision_rounds_created_at_idx" ON "revision_rounds" USING btree ("created_at");
  CREATE INDEX "_revision_rounds_v_parent_idx" ON "_revision_rounds_v" USING btree ("parent_id");
  CREATE INDEX "_revision_rounds_v_version_version_edition_idx" ON "_revision_rounds_v" USING btree ("version_edition_id");
  CREATE INDEX "_revision_rounds_v_version_version_submission_idx" ON "_revision_rounds_v" USING btree ("version_submission_id");
  CREATE INDEX "_revision_rounds_v_version_version_requested_by_idx" ON "_revision_rounds_v" USING btree ("version_requested_by_id");
  CREATE INDEX "_revision_rounds_v_version_version_revised_manuscript_idx" ON "_revision_rounds_v" USING btree ("version_revised_manuscript_id");
  CREATE INDEX "_revision_rounds_v_version_version_round_key_idx" ON "_revision_rounds_v" USING btree ("version_round_key");
  CREATE INDEX "_revision_rounds_v_version_version_updated_at_idx" ON "_revision_rounds_v" USING btree ("version_updated_at");
  CREATE INDEX "_revision_rounds_v_version_version_created_at_idx" ON "_revision_rounds_v" USING btree ("version_created_at");
  CREATE INDEX "_revision_rounds_v_created_at_idx" ON "_revision_rounds_v" USING btree ("created_at");
  CREATE INDEX "_revision_rounds_v_updated_at_idx" ON "_revision_rounds_v" USING btree ("updated_at");
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_camera_ready_file_id_submission_files_id_fk" FOREIGN KEY ("camera_ready_file_id") REFERENCES "public"."submission_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviewer_assignments" ADD CONSTRAINT "reviewer_assignments_revision_round_id_revision_rounds_id_fk" FOREIGN KEY ("revision_round_id") REFERENCES "public"."revision_rounds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_reviewer_assignments_v" ADD CONSTRAINT "_reviewer_assignments_v_version_revision_round_id_revision_rounds_id_fk" FOREIGN KEY ("version_revision_round_id") REFERENCES "public"."revision_rounds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_revision_round_id_revision_rounds_id_fk" FOREIGN KEY ("revision_round_id") REFERENCES "public"."revision_rounds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_revision_rounds_fk" FOREIGN KEY ("revision_rounds_id") REFERENCES "public"."revision_rounds"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "submissions_camera_ready_file_idx" ON "submissions" USING btree ("camera_ready_file_id");
  CREATE INDEX "reviewer_assignments_revision_round_idx" ON "reviewer_assignments" USING btree ("revision_round_id");
  CREATE INDEX "_reviewer_assignments_v_version_version_revision_round_idx" ON "_reviewer_assignments_v" USING btree ("version_revision_round_id");
  CREATE INDEX "submission_files_submission_idx" ON "submission_files" USING btree ("submission_id");
  CREATE INDEX "submission_files_revision_round_idx" ON "submission_files" USING btree ("revision_round_id");
  CREATE UNIQUE INDEX "submission_files_stage_key_idx" ON "submission_files" USING btree ("stage_key");
  CREATE INDEX "payload_locked_documents_rels_revision_rounds_id_idx" ON "payload_locked_documents_rels" USING btree ("revision_rounds_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "submissions" DROP CONSTRAINT "submissions_camera_ready_file_id_submission_files_id_fk";
  
  ALTER TABLE "reviewer_assignments" DROP CONSTRAINT "reviewer_assignments_revision_round_id_revision_rounds_id_fk";
  
  ALTER TABLE "_reviewer_assignments_v" DROP CONSTRAINT "_reviewer_assignments_v_version_revision_round_id_revision_rounds_id_fk";
  
  ALTER TABLE "submission_files" DROP CONSTRAINT "submission_files_submission_id_submissions_id_fk";
  
  ALTER TABLE "submission_files" DROP CONSTRAINT "submission_files_revision_round_id_revision_rounds_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_revision_rounds_fk";
  
  DROP INDEX "submissions_camera_ready_file_idx";
  DROP INDEX "reviewer_assignments_revision_round_idx";
  DROP INDEX "_reviewer_assignments_v_version_version_revision_round_idx";
  DROP INDEX "submission_files_submission_idx";
  DROP INDEX "submission_files_revision_round_idx";
  DROP INDEX "submission_files_stage_key_idx";
  DROP INDEX "payload_locked_documents_rels_revision_rounds_id_idx";
  UPDATE "reviewer_assignments"
    SET "assignment_key" = "submission_id"::text || ':' || "reviewer_id"::text,
        "slot_key" = "submission_id"::text || ':' || "reviewer_number"::text;
  UPDATE "_reviewer_assignments_v"
    SET "version_assignment_key" = "version_submission_id"::text || ':' || "version_reviewer_id"::text,
        "version_slot_key" = "version_submission_id"::text || ':' || "version_reviewer_number"::text;
  ALTER TABLE "revision_rounds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_revision_rounds_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "revision_rounds" CASCADE;
  DROP TABLE "_revision_rounds_v" CASCADE;
  ALTER TABLE "submissions" DROP COLUMN "camera_ready_file_id";
  ALTER TABLE "submissions" DROP COLUMN "camera_ready_submitted_at";
  ALTER TABLE "reviewer_assignments" DROP COLUMN "revision_round_id";
  ALTER TABLE "reviewer_assignments" DROP COLUMN "released_to_author_at";
  ALTER TABLE "_reviewer_assignments_v" DROP COLUMN "version_revision_round_id";
  ALTER TABLE "_reviewer_assignments_v" DROP COLUMN "version_released_to_author_at";
  ALTER TABLE "submission_files" DROP COLUMN "kind";
  ALTER TABLE "submission_files" DROP COLUMN "submission_id";
  ALTER TABLE "submission_files" DROP COLUMN "revision_round_id";
  ALTER TABLE "submission_files" DROP COLUMN "stage_key";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "revision_rounds_id";
  DROP TYPE "public"."enum_revision_rounds_status";
  DROP TYPE "public"."enum__revision_rounds_v_version_status";
  DROP TYPE "public"."enum_submission_files_kind";`)
}
