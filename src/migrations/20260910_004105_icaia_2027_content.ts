import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_editions_conference_date_status" AS ENUM('confirmed', 'unresolved');
  CREATE TYPE "public"."enum__editions_v_version_conference_date_status" AS ENUM('confirmed', 'unresolved');
  CREATE TYPE "public"."enum_conference_details_submission_languages" AS ENUM('fr', 'en', 'ar');
  CREATE TYPE "public"."enum_conference_details_accepted_formats" AS ENUM('docx', 'pdf');
  CREATE TYPE "public"."enum_conference_details_decision_outcomes" AS ENUM('acceptance', 'conditional-revision', 'rejection');
  CREATE TYPE "public"."enum_conference_details_registration_fees_currency" AS ENUM('MAD', 'EUR');
  CREATE TYPE "public"."enum_conference_details_registration_fees_alternate_currency" AS ENUM('MAD', 'EUR');
  CREATE TYPE "public"."enum_sponsors_partner_type" AS ENUM('organization', 'journal');
  CREATE TYPE "public"."enum_sponsors_partner_scope" AS ENUM('national', 'international');
  ALTER TYPE "public"."enum_committees_type" ADD VALUE 'honorary' BEFORE 'scientific';
  ALTER TYPE "public"."enum_committees_type" ADD VALUE 'steering' BEFORE 'scientific';
  CREATE TABLE "editions_conference_date_candidates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone
  );
  
  CREATE TABLE "editions_conference_date_candidates_locales" (
  	"source" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "editions_organizers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "_editions_v_version_conference_date_candidates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editions_v_version_conference_date_candidates_locales" (
  	"source" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_editions_v_version_organizers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "thematic_axes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"edition_id" integer NOT NULL,
  	"code" varchar NOT NULL,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "thematic_axes_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "conference_details_contribution_types" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL
  );
  
  CREATE TABLE "conference_details_contribution_types_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "conference_details_submission_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_conference_details_submission_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "conference_details_accepted_formats" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_conference_details_accepted_formats",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "conference_details_decision_outcomes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_conference_details_decision_outcomes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "conference_details_registration_fees" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"amount" numeric,
  	"currency" "enum_conference_details_registration_fees_currency",
  	"alternate_amount" numeric,
  	"alternate_currency" "enum_conference_details_registration_fees_alternate_currency",
  	"exempt" boolean DEFAULT false
  );
  
  CREATE TABLE "conference_details_registration_fees_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "conference_details" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"edition_id" integer NOT NULL,
  	"english_abstract_required" boolean DEFAULT false,
  	"extended_abstract_min_words" numeric,
  	"extended_abstract_max_words" numeric,
  	"full_paper_min_pages" numeric,
  	"full_paper_max_pages" numeric,
  	"anonymized_manuscript_required" boolean DEFAULT false,
  	"separate_author_cover_sheet_required" boolean DEFAULT false,
  	"reviewers_per_submission" numeric,
  	"third_reviewer_on_disagreement" boolean DEFAULT false,
  	"anonymized_reports_returned" boolean DEFAULT false,
  	"isbn_proceedings" boolean DEFAULT false,
  	"registration_required" boolean DEFAULT false,
  	"payment_required" boolean DEFAULT false,
  	"payment_proof_required" boolean DEFAULT false,
  	"invitation_letters_available" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "editions" ADD COLUMN "edition_number" numeric;
  ALTER TABLE "editions" ADD COLUMN "conference_date_status" "enum_editions_conference_date_status" DEFAULT 'confirmed';
  ALTER TABLE "editions" ADD COLUMN "contact_email" varchar;
  ALTER TABLE "editions" ADD COLUMN "registration_enabled" boolean DEFAULT false;
  ALTER TABLE "_editions_v" ADD COLUMN "version_edition_number" numeric;
  ALTER TABLE "_editions_v" ADD COLUMN "version_conference_date_status" "enum__editions_v_version_conference_date_status" DEFAULT 'confirmed';
  ALTER TABLE "_editions_v" ADD COLUMN "version_contact_email" varchar;
  ALTER TABLE "_editions_v" ADD COLUMN "version_registration_enabled" boolean DEFAULT false;
  ALTER TABLE "sponsors" ADD COLUMN "partner_type" "enum_sponsors_partner_type" DEFAULT 'organization';
  ALTER TABLE "sponsors" ADD COLUMN "partner_scope" "enum_sponsors_partner_scope";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "thematic_axes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "conference_details_id" integer;
  ALTER TABLE "editions_conference_date_candidates" ADD CONSTRAINT "editions_conference_date_candidates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editions_conference_date_candidates_locales" ADD CONSTRAINT "editions_conference_date_candidates_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editions_conference_date_candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editions_organizers" ADD CONSTRAINT "editions_organizers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editions_v_version_conference_date_candidates" ADD CONSTRAINT "_editions_v_version_conference_date_candidates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editions_v_version_conference_date_candidates_locales" ADD CONSTRAINT "_editions_v_version_conference_date_candidates_locales_pa_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editions_v_version_conference_date_candidates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editions_v_version_organizers" ADD CONSTRAINT "_editions_v_version_organizers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "thematic_axes" ADD CONSTRAINT "thematic_axes_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "thematic_axes_locales" ADD CONSTRAINT "thematic_axes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."thematic_axes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conference_details_contribution_types" ADD CONSTRAINT "conference_details_contribution_types_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conference_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conference_details_contribution_types_locales" ADD CONSTRAINT "conference_details_contribution_types_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conference_details_contribution_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conference_details_submission_languages" ADD CONSTRAINT "conference_details_submission_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."conference_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conference_details_accepted_formats" ADD CONSTRAINT "conference_details_accepted_formats_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."conference_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conference_details_decision_outcomes" ADD CONSTRAINT "conference_details_decision_outcomes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."conference_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conference_details_registration_fees" ADD CONSTRAINT "conference_details_registration_fees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conference_details"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conference_details_registration_fees_locales" ADD CONSTRAINT "conference_details_registration_fees_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conference_details_registration_fees"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conference_details" ADD CONSTRAINT "conference_details_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "editions_conference_date_candidates_order_idx" ON "editions_conference_date_candidates" USING btree ("_order");
  CREATE INDEX "editions_conference_date_candidates_parent_id_idx" ON "editions_conference_date_candidates" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "editions_conference_date_candidates_locales_locale_parent_id" ON "editions_conference_date_candidates_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "editions_organizers_order_idx" ON "editions_organizers" USING btree ("_order");
  CREATE INDEX "editions_organizers_parent_id_idx" ON "editions_organizers" USING btree ("_parent_id");
  CREATE INDEX "_editions_v_version_conference_date_candidates_order_idx" ON "_editions_v_version_conference_date_candidates" USING btree ("_order");
  CREATE INDEX "_editions_v_version_conference_date_candidates_parent_id_idx" ON "_editions_v_version_conference_date_candidates" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_editions_v_version_conference_date_candidates_locales_local" ON "_editions_v_version_conference_date_candidates_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_editions_v_version_organizers_order_idx" ON "_editions_v_version_organizers" USING btree ("_order");
  CREATE INDEX "_editions_v_version_organizers_parent_id_idx" ON "_editions_v_version_organizers" USING btree ("_parent_id");
  CREATE INDEX "thematic_axes_edition_idx" ON "thematic_axes" USING btree ("edition_id");
  CREATE INDEX "thematic_axes_updated_at_idx" ON "thematic_axes" USING btree ("updated_at");
  CREATE INDEX "thematic_axes_created_at_idx" ON "thematic_axes" USING btree ("created_at");
  CREATE UNIQUE INDEX "thematic_axes_locales_locale_parent_id_unique" ON "thematic_axes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "conference_details_contribution_types_order_idx" ON "conference_details_contribution_types" USING btree ("_order");
  CREATE INDEX "conference_details_contribution_types_parent_id_idx" ON "conference_details_contribution_types" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "conference_details_contribution_types_locales_locale_parent_" ON "conference_details_contribution_types_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "conference_details_submission_languages_order_idx" ON "conference_details_submission_languages" USING btree ("order");
  CREATE INDEX "conference_details_submission_languages_parent_idx" ON "conference_details_submission_languages" USING btree ("parent_id");
  CREATE INDEX "conference_details_accepted_formats_order_idx" ON "conference_details_accepted_formats" USING btree ("order");
  CREATE INDEX "conference_details_accepted_formats_parent_idx" ON "conference_details_accepted_formats" USING btree ("parent_id");
  CREATE INDEX "conference_details_decision_outcomes_order_idx" ON "conference_details_decision_outcomes" USING btree ("order");
  CREATE INDEX "conference_details_decision_outcomes_parent_idx" ON "conference_details_decision_outcomes" USING btree ("parent_id");
  CREATE INDEX "conference_details_registration_fees_order_idx" ON "conference_details_registration_fees" USING btree ("_order");
  CREATE INDEX "conference_details_registration_fees_parent_id_idx" ON "conference_details_registration_fees" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "conference_details_registration_fees_locales_locale_parent_i" ON "conference_details_registration_fees_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "conference_details_edition_idx" ON "conference_details" USING btree ("edition_id");
  CREATE INDEX "conference_details_updated_at_idx" ON "conference_details" USING btree ("updated_at");
  CREATE INDEX "conference_details_created_at_idx" ON "conference_details" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_thematic_axes_fk" FOREIGN KEY ("thematic_axes_id") REFERENCES "public"."thematic_axes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_conference_details_fk" FOREIGN KEY ("conference_details_id") REFERENCES "public"."conference_details"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_thematic_axes_id_idx" ON "payload_locked_documents_rels" USING btree ("thematic_axes_id");
  CREATE INDEX "payload_locked_documents_rels_conference_details_id_idx" ON "payload_locked_documents_rels" USING btree ("conference_details_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "editions_conference_date_candidates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editions_conference_date_candidates_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editions_organizers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editions_v_version_conference_date_candidates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editions_v_version_conference_date_candidates_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_editions_v_version_organizers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thematic_axes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "thematic_axes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details_contribution_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details_contribution_types_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details_submission_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details_accepted_formats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details_decision_outcomes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details_registration_fees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details_registration_fees_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "editions_conference_date_candidates" CASCADE;
  DROP TABLE "editions_conference_date_candidates_locales" CASCADE;
  DROP TABLE "editions_organizers" CASCADE;
  DROP TABLE "_editions_v_version_conference_date_candidates" CASCADE;
  DROP TABLE "_editions_v_version_conference_date_candidates_locales" CASCADE;
  DROP TABLE "_editions_v_version_organizers" CASCADE;
  DROP TABLE "thematic_axes" CASCADE;
  DROP TABLE "thematic_axes_locales" CASCADE;
  DROP TABLE "conference_details_contribution_types" CASCADE;
  DROP TABLE "conference_details_contribution_types_locales" CASCADE;
  DROP TABLE "conference_details_submission_languages" CASCADE;
  DROP TABLE "conference_details_accepted_formats" CASCADE;
  DROP TABLE "conference_details_decision_outcomes" CASCADE;
  DROP TABLE "conference_details_registration_fees" CASCADE;
  DROP TABLE "conference_details_registration_fees_locales" CASCADE;
  DROP TABLE "conference_details" CASCADE;
  ALTER TABLE "committees" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_committees_type";
  CREATE TYPE "public"."enum_committees_type" AS ENUM('scientific', 'organization');
  ALTER TABLE "committees" ALTER COLUMN "type" SET DATA TYPE "public"."enum_committees_type" USING "type"::"public"."enum_committees_type";
  DROP INDEX "payload_locked_documents_rels_thematic_axes_id_idx";
  DROP INDEX "payload_locked_documents_rels_conference_details_id_idx";
  ALTER TABLE "editions" DROP COLUMN "edition_number";
  ALTER TABLE "editions" DROP COLUMN "conference_date_status";
  ALTER TABLE "editions" DROP COLUMN "contact_email";
  ALTER TABLE "editions" DROP COLUMN "registration_enabled";
  ALTER TABLE "_editions_v" DROP COLUMN "version_edition_number";
  ALTER TABLE "_editions_v" DROP COLUMN "version_conference_date_status";
  ALTER TABLE "_editions_v" DROP COLUMN "version_contact_email";
  ALTER TABLE "_editions_v" DROP COLUMN "version_registration_enabled";
  ALTER TABLE "sponsors" DROP COLUMN "partner_type";
  ALTER TABLE "sponsors" DROP COLUMN "partner_scope";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "thematic_axes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "conference_details_id";
  DROP TYPE "public"."enum_editions_conference_date_status";
  DROP TYPE "public"."enum__editions_v_version_conference_date_status";
  DROP TYPE "public"."enum_conference_details_submission_languages";
  DROP TYPE "public"."enum_conference_details_accepted_formats";
  DROP TYPE "public"."enum_conference_details_decision_outcomes";
  DROP TYPE "public"."enum_conference_details_registration_fees_currency";
  DROP TYPE "public"."enum_conference_details_registration_fees_alternate_currency";
  DROP TYPE "public"."enum_sponsors_partner_type";
  DROP TYPE "public"."enum_sponsors_partner_scope";`)
}
