import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_submissions_review_state" AS ENUM('unassigned', 'in-review', 'ready-for-decision', 'third-review-recommended', 'third-review-in-progress');
  CREATE TYPE "public"."enum_reviewer_assignments_reviewer_number" AS ENUM('1', '2', '3');
  CREATE TYPE "public"."enum_reviewer_assignments_status" AS ENUM('assigned', 'completed');
  CREATE TYPE "public"."enum_reviewer_assignments_recommendation" AS ENUM('accept', 'revision', 'reject');
  CREATE TYPE "public"."enum__reviewer_assignments_v_version_reviewer_number" AS ENUM('1', '2', '3');
  CREATE TYPE "public"."enum__reviewer_assignments_v_version_status" AS ENUM('assigned', 'completed');
  CREATE TYPE "public"."enum__reviewer_assignments_v_version_recommendation" AS ENUM('accept', 'revision', 'reject');
  ALTER TYPE "public"."enum_submissions_status" ADD VALUE 'revision-required' BEFORE 'accepted';
  CREATE TABLE "reviewer_assignments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"edition_id" integer NOT NULL,
  	"submission_id" integer NOT NULL,
  	"reviewer_id" integer NOT NULL,
  	"reviewer_number" "enum_reviewer_assignments_reviewer_number" NOT NULL,
  	"status" "enum_reviewer_assignments_status" DEFAULT 'assigned' NOT NULL,
  	"recommendation" "enum_reviewer_assignments_recommendation",
  	"author_comments" varchar,
  	"editor_comments" varchar,
  	"assigned_at" timestamp(3) with time zone NOT NULL,
  	"submitted_at" timestamp(3) with time zone,
  	"assignment_key" varchar NOT NULL,
  	"slot_key" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_reviewer_assignments_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_edition_id" integer NOT NULL,
  	"version_submission_id" integer NOT NULL,
  	"version_reviewer_id" integer NOT NULL,
  	"version_reviewer_number" "enum__reviewer_assignments_v_version_reviewer_number" NOT NULL,
  	"version_status" "enum__reviewer_assignments_v_version_status" DEFAULT 'assigned' NOT NULL,
  	"version_recommendation" "enum__reviewer_assignments_v_version_recommendation",
  	"version_author_comments" varchar,
  	"version_editor_comments" varchar,
  	"version_assigned_at" timestamp(3) with time zone NOT NULL,
  	"version_submitted_at" timestamp(3) with time zone,
  	"version_assignment_key" varchar NOT NULL,
  	"version_slot_key" varchar NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "submissions" ADD COLUMN "author_decision_comments" varchar;
  ALTER TABLE "submissions" ADD COLUMN "review_state" "enum_submissions_review_state" DEFAULT 'unassigned' NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reviewer_assignments_id" integer;
  ALTER TABLE "reviewer_assignments" ADD CONSTRAINT "reviewer_assignments_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviewer_assignments" ADD CONSTRAINT "reviewer_assignments_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviewer_assignments" ADD CONSTRAINT "reviewer_assignments_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_reviewer_assignments_v" ADD CONSTRAINT "_reviewer_assignments_v_parent_id_reviewer_assignments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviewer_assignments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_reviewer_assignments_v" ADD CONSTRAINT "_reviewer_assignments_v_version_edition_id_editions_id_fk" FOREIGN KEY ("version_edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_reviewer_assignments_v" ADD CONSTRAINT "_reviewer_assignments_v_version_submission_id_submissions_id_fk" FOREIGN KEY ("version_submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_reviewer_assignments_v" ADD CONSTRAINT "_reviewer_assignments_v_version_reviewer_id_users_id_fk" FOREIGN KEY ("version_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "reviewer_assignments_edition_idx" ON "reviewer_assignments" USING btree ("edition_id");
  CREATE INDEX "reviewer_assignments_submission_idx" ON "reviewer_assignments" USING btree ("submission_id");
  CREATE INDEX "reviewer_assignments_reviewer_idx" ON "reviewer_assignments" USING btree ("reviewer_id");
  CREATE UNIQUE INDEX "reviewer_assignments_assignment_key_idx" ON "reviewer_assignments" USING btree ("assignment_key");
  CREATE UNIQUE INDEX "reviewer_assignments_slot_key_idx" ON "reviewer_assignments" USING btree ("slot_key");
  CREATE INDEX "reviewer_assignments_updated_at_idx" ON "reviewer_assignments" USING btree ("updated_at");
  CREATE INDEX "reviewer_assignments_created_at_idx" ON "reviewer_assignments" USING btree ("created_at");
  CREATE INDEX "_reviewer_assignments_v_parent_idx" ON "_reviewer_assignments_v" USING btree ("parent_id");
  CREATE INDEX "_reviewer_assignments_v_version_version_edition_idx" ON "_reviewer_assignments_v" USING btree ("version_edition_id");
  CREATE INDEX "_reviewer_assignments_v_version_version_submission_idx" ON "_reviewer_assignments_v" USING btree ("version_submission_id");
  CREATE INDEX "_reviewer_assignments_v_version_version_reviewer_idx" ON "_reviewer_assignments_v" USING btree ("version_reviewer_id");
  CREATE INDEX "_reviewer_assignments_v_version_version_assignment_key_idx" ON "_reviewer_assignments_v" USING btree ("version_assignment_key");
  CREATE INDEX "_reviewer_assignments_v_version_version_slot_key_idx" ON "_reviewer_assignments_v" USING btree ("version_slot_key");
  CREATE INDEX "_reviewer_assignments_v_version_version_updated_at_idx" ON "_reviewer_assignments_v" USING btree ("version_updated_at");
  CREATE INDEX "_reviewer_assignments_v_version_version_created_at_idx" ON "_reviewer_assignments_v" USING btree ("version_created_at");
  CREATE INDEX "_reviewer_assignments_v_created_at_idx" ON "_reviewer_assignments_v" USING btree ("created_at");
  CREATE INDEX "_reviewer_assignments_v_updated_at_idx" ON "_reviewer_assignments_v" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviewer_assignments_fk" FOREIGN KEY ("reviewer_assignments_id") REFERENCES "public"."reviewer_assignments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_reviewer_assignments_id_idx" ON "payload_locked_documents_rels" USING btree ("reviewer_assignments_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_reviewer_assignments_fk";
  DROP INDEX "payload_locked_documents_rels_reviewer_assignments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "reviewer_assignments_id";
  ALTER TABLE "reviewer_assignments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_reviewer_assignments_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "reviewer_assignments" CASCADE;
  DROP TABLE "_reviewer_assignments_v" CASCADE;
  UPDATE "submissions" SET "status" = 'pending' WHERE "status" = 'revision-required';
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_submissions_status";
  CREATE TYPE "public"."enum_submissions_status" AS ENUM('pending', 'accepted', 'rejected');
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_submissions_status";
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DATA TYPE "public"."enum_submissions_status" USING "status"::"public"."enum_submissions_status";
  ALTER TABLE "submissions" DROP COLUMN "author_decision_comments";
  ALTER TABLE "submissions" DROP COLUMN "review_state";
  DROP TYPE "public"."enum_submissions_review_state";
  DROP TYPE "public"."enum_reviewer_assignments_reviewer_number";
  DROP TYPE "public"."enum_reviewer_assignments_status";
  DROP TYPE "public"."enum_reviewer_assignments_recommendation";
  DROP TYPE "public"."enum__reviewer_assignments_v_version_reviewer_number";
  DROP TYPE "public"."enum__reviewer_assignments_v_version_status";
  DROP TYPE "public"."enum__reviewer_assignments_v_version_recommendation";`)
}
