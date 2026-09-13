import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_registrations_fee_currency" AS ENUM('MAD', 'EUR');
  CREATE TYPE "public"."enum__registrations_v_version_fee_currency" AS ENUM('MAD', 'EUR');
  CREATE TYPE "public"."enum__registrations_v_version_locale" AS ENUM('fr', 'en');
  CREATE TYPE "public"."enum__registrations_v_version_status" AS ENUM('confirmed', 'cancelled');
  CREATE TYPE "public"."enum_payment_proofs_status" AS ENUM('submitted', 'verified', 'rejected');
  CREATE TYPE "public"."enum__payment_proofs_v_version_status" AS ENUM('submitted', 'verified', 'rejected');
  CREATE TYPE "public"."enum_invitation_letters_status" AS ENUM('draft', 'issued');
  CREATE TYPE "public"."enum_invitation_letters_eligibility_basis" AS ENUM('verified', 'exempt');
  CREATE TYPE "public"."enum__invitation_letters_v_version_status" AS ENUM('draft', 'issued');
  CREATE TYPE "public"."enum__invitation_letters_v_version_eligibility_basis" AS ENUM('verified', 'exempt');
  CREATE TYPE "public"."enum_conference_details_payment_proof_formats" AS ENUM('pdf', 'jpeg', 'png');
  CREATE TABLE "_registrations_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_active_person_key" varchar,
  	"version_active_email_key" varchar,
  	"version_fee_details_id" integer,
  	"version_fee_category" varchar,
  	"version_fee_label" varchar,
  	"version_fee_amount" numeric,
  	"version_fee_currency" "enum__registrations_v_version_fee_currency",
  	"version_fee_exempt" boolean,
  	"version_exemption_approved" boolean,
  	"version_exemption_approved_by_id" integer,
  	"version_exemption_approved_at" timestamp(3) with time zone,
  	"version_edition_id" integer NOT NULL,
  	"version_user_id" integer,
  	"version_first_name" varchar NOT NULL,
  	"version_last_name" varchar NOT NULL,
  	"version_email" varchar NOT NULL,
  	"version_locale" "enum__registrations_v_version_locale" DEFAULT 'fr' NOT NULL,
  	"version_affiliation" varchar,
  	"version_country" varchar,
  	"version_status" "enum__registrations_v_version_status" DEFAULT 'confirmed' NOT NULL,
  	"version_checked_in" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payment_proofs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"registration_id" integer NOT NULL,
  	"edition_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"sequence" numeric NOT NULL,
  	"proof_key" varchar,
  	"status" "enum_payment_proofs_status" DEFAULT 'submitted' NOT NULL,
  	"review_comment" varchar,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"prefix" varchar DEFAULT 'payment-proofs',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "_payment_proofs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_registration_id" integer NOT NULL,
  	"version_edition_id" integer NOT NULL,
  	"version_user_id" integer NOT NULL,
  	"version_sequence" numeric NOT NULL,
  	"version_proof_key" varchar,
  	"version_status" "enum__payment_proofs_v_version_status" DEFAULT 'submitted' NOT NULL,
  	"version_review_comment" varchar,
  	"version_reviewed_by_id" integer,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_prefix" varchar DEFAULT 'payment-proofs',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "invitation_letters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"registration_id" integer NOT NULL,
  	"edition_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"status" "enum_invitation_letters_status" DEFAULT 'draft' NOT NULL,
  	"body" varchar NOT NULL,
  	"recipient_name" varchar,
  	"recipient_email" varchar,
  	"organizer_note" varchar,
  	"issued_by_id" integer,
  	"issued_at" timestamp(3) with time zone,
  	"eligibility_basis" "enum_invitation_letters_eligibility_basis",
  	"verified_proof_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_invitation_letters_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_registration_id" integer NOT NULL,
  	"version_edition_id" integer NOT NULL,
  	"version_user_id" integer NOT NULL,
  	"version_status" "enum__invitation_letters_v_version_status" DEFAULT 'draft' NOT NULL,
  	"version_body" varchar NOT NULL,
  	"version_recipient_name" varchar,
  	"version_recipient_email" varchar,
  	"version_organizer_note" varchar,
  	"version_issued_by_id" integer,
  	"version_issued_at" timestamp(3) with time zone,
  	"version_eligibility_basis" "enum__invitation_letters_v_version_eligibility_basis",
  	"version_verified_proof_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "conference_details_payment_proof_formats" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_conference_details_payment_proof_formats",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "registrations" ADD COLUMN "active_person_key" varchar;
  ALTER TABLE "registrations" ADD COLUMN "active_email_key" varchar;
  ALTER TABLE "registrations" ADD COLUMN "fee_details_id" integer;
  ALTER TABLE "registrations" ADD COLUMN "fee_category" varchar;
  ALTER TABLE "registrations" ADD COLUMN "fee_label" varchar;
  ALTER TABLE "registrations" ADD COLUMN "fee_amount" numeric;
  ALTER TABLE "registrations" ADD COLUMN "fee_currency" "enum_registrations_fee_currency";
  ALTER TABLE "registrations" ADD COLUMN "fee_exempt" boolean;
  ALTER TABLE "registrations" ADD COLUMN "exemption_approved" boolean;
  ALTER TABLE "registrations" ADD COLUMN "exemption_approved_by_id" integer;
  ALTER TABLE "registrations" ADD COLUMN "exemption_approved_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payment_proofs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "invitation_letters_id" integer;
  ALTER TABLE "_registrations_v" ADD CONSTRAINT "_registrations_v_parent_id_registrations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_registrations_v" ADD CONSTRAINT "_registrations_v_version_fee_details_id_conference_details_id_fk" FOREIGN KEY ("version_fee_details_id") REFERENCES "public"."conference_details"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_registrations_v" ADD CONSTRAINT "_registrations_v_version_exemption_approved_by_id_users_id_fk" FOREIGN KEY ("version_exemption_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_registrations_v" ADD CONSTRAINT "_registrations_v_version_edition_id_editions_id_fk" FOREIGN KEY ("version_edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_registrations_v" ADD CONSTRAINT "_registrations_v_version_user_id_users_id_fk" FOREIGN KEY ("version_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payment_proofs_v" ADD CONSTRAINT "_payment_proofs_v_parent_id_payment_proofs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payment_proofs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payment_proofs_v" ADD CONSTRAINT "_payment_proofs_v_version_registration_id_registrations_id_fk" FOREIGN KEY ("version_registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payment_proofs_v" ADD CONSTRAINT "_payment_proofs_v_version_edition_id_editions_id_fk" FOREIGN KEY ("version_edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payment_proofs_v" ADD CONSTRAINT "_payment_proofs_v_version_user_id_users_id_fk" FOREIGN KEY ("version_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_payment_proofs_v" ADD CONSTRAINT "_payment_proofs_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitation_letters" ADD CONSTRAINT "invitation_letters_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitation_letters" ADD CONSTRAINT "invitation_letters_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitation_letters" ADD CONSTRAINT "invitation_letters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitation_letters" ADD CONSTRAINT "invitation_letters_issued_by_id_users_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invitation_letters" ADD CONSTRAINT "invitation_letters_verified_proof_id_payment_proofs_id_fk" FOREIGN KEY ("verified_proof_id") REFERENCES "public"."payment_proofs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_invitation_letters_v" ADD CONSTRAINT "_invitation_letters_v_parent_id_invitation_letters_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."invitation_letters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_invitation_letters_v" ADD CONSTRAINT "_invitation_letters_v_version_registration_id_registrations_id_fk" FOREIGN KEY ("version_registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_invitation_letters_v" ADD CONSTRAINT "_invitation_letters_v_version_edition_id_editions_id_fk" FOREIGN KEY ("version_edition_id") REFERENCES "public"."editions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_invitation_letters_v" ADD CONSTRAINT "_invitation_letters_v_version_user_id_users_id_fk" FOREIGN KEY ("version_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_invitation_letters_v" ADD CONSTRAINT "_invitation_letters_v_version_issued_by_id_users_id_fk" FOREIGN KEY ("version_issued_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_invitation_letters_v" ADD CONSTRAINT "_invitation_letters_v_version_verified_proof_id_payment_proofs_id_fk" FOREIGN KEY ("version_verified_proof_id") REFERENCES "public"."payment_proofs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conference_details_payment_proof_formats" ADD CONSTRAINT "conference_details_payment_proof_formats_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."conference_details"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_registrations_v_parent_idx" ON "_registrations_v" USING btree ("parent_id");
  CREATE INDEX "_registrations_v_version_version_active_person_key_idx" ON "_registrations_v" USING btree ("version_active_person_key");
  CREATE INDEX "_registrations_v_version_version_active_email_key_idx" ON "_registrations_v" USING btree ("version_active_email_key");
  CREATE INDEX "_registrations_v_version_version_fee_details_idx" ON "_registrations_v" USING btree ("version_fee_details_id");
  CREATE INDEX "_registrations_v_version_version_exemption_approved_by_idx" ON "_registrations_v" USING btree ("version_exemption_approved_by_id");
  CREATE INDEX "_registrations_v_version_version_edition_idx" ON "_registrations_v" USING btree ("version_edition_id");
  CREATE INDEX "_registrations_v_version_version_user_idx" ON "_registrations_v" USING btree ("version_user_id");
  CREATE INDEX "_registrations_v_version_version_updated_at_idx" ON "_registrations_v" USING btree ("version_updated_at");
  CREATE INDEX "_registrations_v_version_version_created_at_idx" ON "_registrations_v" USING btree ("version_created_at");
  CREATE INDEX "_registrations_v_created_at_idx" ON "_registrations_v" USING btree ("created_at");
  CREATE INDEX "_registrations_v_updated_at_idx" ON "_registrations_v" USING btree ("updated_at");
  CREATE INDEX "payment_proofs_registration_idx" ON "payment_proofs" USING btree ("registration_id");
  CREATE INDEX "payment_proofs_edition_idx" ON "payment_proofs" USING btree ("edition_id");
  CREATE INDEX "payment_proofs_user_idx" ON "payment_proofs" USING btree ("user_id");
  CREATE UNIQUE INDEX "payment_proofs_proof_key_idx" ON "payment_proofs" USING btree ("proof_key");
  CREATE INDEX "payment_proofs_reviewed_by_idx" ON "payment_proofs" USING btree ("reviewed_by_id");
  CREATE INDEX "payment_proofs_updated_at_idx" ON "payment_proofs" USING btree ("updated_at");
  CREATE INDEX "payment_proofs_created_at_idx" ON "payment_proofs" USING btree ("created_at");
  CREATE UNIQUE INDEX "payment_proofs_filename_idx" ON "payment_proofs" USING btree ("filename");
  CREATE INDEX "_payment_proofs_v_parent_idx" ON "_payment_proofs_v" USING btree ("parent_id");
  CREATE INDEX "_payment_proofs_v_version_version_registration_idx" ON "_payment_proofs_v" USING btree ("version_registration_id");
  CREATE INDEX "_payment_proofs_v_version_version_edition_idx" ON "_payment_proofs_v" USING btree ("version_edition_id");
  CREATE INDEX "_payment_proofs_v_version_version_user_idx" ON "_payment_proofs_v" USING btree ("version_user_id");
  CREATE INDEX "_payment_proofs_v_version_version_proof_key_idx" ON "_payment_proofs_v" USING btree ("version_proof_key");
  CREATE INDEX "_payment_proofs_v_version_version_reviewed_by_idx" ON "_payment_proofs_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "_payment_proofs_v_version_version_updated_at_idx" ON "_payment_proofs_v" USING btree ("version_updated_at");
  CREATE INDEX "_payment_proofs_v_version_version_created_at_idx" ON "_payment_proofs_v" USING btree ("version_created_at");
  CREATE INDEX "_payment_proofs_v_version_version_filename_idx" ON "_payment_proofs_v" USING btree ("version_filename");
  CREATE INDEX "_payment_proofs_v_created_at_idx" ON "_payment_proofs_v" USING btree ("created_at");
  CREATE INDEX "_payment_proofs_v_updated_at_idx" ON "_payment_proofs_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "invitation_letters_registration_idx" ON "invitation_letters" USING btree ("registration_id");
  CREATE INDEX "invitation_letters_edition_idx" ON "invitation_letters" USING btree ("edition_id");
  CREATE INDEX "invitation_letters_user_idx" ON "invitation_letters" USING btree ("user_id");
  CREATE INDEX "invitation_letters_issued_by_idx" ON "invitation_letters" USING btree ("issued_by_id");
  CREATE INDEX "invitation_letters_verified_proof_idx" ON "invitation_letters" USING btree ("verified_proof_id");
  CREATE INDEX "invitation_letters_updated_at_idx" ON "invitation_letters" USING btree ("updated_at");
  CREATE INDEX "invitation_letters_created_at_idx" ON "invitation_letters" USING btree ("created_at");
  CREATE INDEX "_invitation_letters_v_parent_idx" ON "_invitation_letters_v" USING btree ("parent_id");
  CREATE INDEX "_invitation_letters_v_version_version_registration_idx" ON "_invitation_letters_v" USING btree ("version_registration_id");
  CREATE INDEX "_invitation_letters_v_version_version_edition_idx" ON "_invitation_letters_v" USING btree ("version_edition_id");
  CREATE INDEX "_invitation_letters_v_version_version_user_idx" ON "_invitation_letters_v" USING btree ("version_user_id");
  CREATE INDEX "_invitation_letters_v_version_version_issued_by_idx" ON "_invitation_letters_v" USING btree ("version_issued_by_id");
  CREATE INDEX "_invitation_letters_v_version_version_verified_proof_idx" ON "_invitation_letters_v" USING btree ("version_verified_proof_id");
  CREATE INDEX "_invitation_letters_v_version_version_updated_at_idx" ON "_invitation_letters_v" USING btree ("version_updated_at");
  CREATE INDEX "_invitation_letters_v_version_version_created_at_idx" ON "_invitation_letters_v" USING btree ("version_created_at");
  CREATE INDEX "_invitation_letters_v_created_at_idx" ON "_invitation_letters_v" USING btree ("created_at");
  CREATE INDEX "_invitation_letters_v_updated_at_idx" ON "_invitation_letters_v" USING btree ("updated_at");
  CREATE INDEX "conference_details_payment_proof_formats_order_idx" ON "conference_details_payment_proof_formats" USING btree ("order");
  CREATE INDEX "conference_details_payment_proof_formats_parent_idx" ON "conference_details_payment_proof_formats" USING btree ("parent_id");
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_fee_details_id_conference_details_id_fk" FOREIGN KEY ("fee_details_id") REFERENCES "public"."conference_details"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_exemption_approved_by_id_users_id_fk" FOREIGN KEY ("exemption_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_proofs_fk" FOREIGN KEY ("payment_proofs_id") REFERENCES "public"."payment_proofs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invitation_letters_fk" FOREIGN KEY ("invitation_letters_id") REFERENCES "public"."invitation_letters"("id") ON DELETE cascade ON UPDATE no action;
  -- Preserve legacy records without inventing fee obligations. Existing duplicate active
  -- identities deliberately fail the unique indexes for organizer reconciliation, never deletion.
  UPDATE "registrations" SET
    "active_person_key" = CASE WHEN "user_id" IS NOT NULL THEN "edition_id"::text || ':' || "user_id"::text END,
    "active_email_key" = "edition_id"::text || ':' || lower(trim("email"))
    WHERE "status" = 'confirmed';
  CREATE UNIQUE INDEX "registrations_active_person_key_idx" ON "registrations" USING btree ("active_person_key");
  CREATE UNIQUE INDEX "registrations_active_email_key_idx" ON "registrations" USING btree ("active_email_key");
  CREATE INDEX "registrations_fee_details_idx" ON "registrations" USING btree ("fee_details_id");
  CREATE INDEX "registrations_exemption_approved_by_idx" ON "registrations" USING btree ("exemption_approved_by_id");
  CREATE INDEX "payload_locked_documents_rels_payment_proofs_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_proofs_id");
  CREATE INDEX "payload_locked_documents_rels_invitation_letters_id_idx" ON "payload_locked_documents_rels" USING btree ("invitation_letters_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_registrations_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payment_proofs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_payment_proofs_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "invitation_letters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_invitation_letters_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conference_details_payment_proof_formats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payment_proofs_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_invitation_letters_fk";
  DROP TABLE "_registrations_v" CASCADE;
  DROP TABLE "payment_proofs" CASCADE;
  DROP TABLE "_payment_proofs_v" CASCADE;
  DROP TABLE "invitation_letters" CASCADE;
  DROP TABLE "_invitation_letters_v" CASCADE;
  DROP TABLE "conference_details_payment_proof_formats" CASCADE;
  ALTER TABLE "registrations" DROP CONSTRAINT "registrations_fee_details_id_conference_details_id_fk";
  
  ALTER TABLE "registrations" DROP CONSTRAINT "registrations_exemption_approved_by_id_users_id_fk";
  
  DROP INDEX "registrations_active_person_key_idx";
  DROP INDEX "registrations_active_email_key_idx";
  DROP INDEX "registrations_fee_details_idx";
  DROP INDEX "registrations_exemption_approved_by_idx";
  DROP INDEX "payload_locked_documents_rels_payment_proofs_id_idx";
  DROP INDEX "payload_locked_documents_rels_invitation_letters_id_idx";
  ALTER TABLE "registrations" DROP COLUMN "active_person_key";
  ALTER TABLE "registrations" DROP COLUMN "active_email_key";
  ALTER TABLE "registrations" DROP COLUMN "fee_details_id";
  ALTER TABLE "registrations" DROP COLUMN "fee_category";
  ALTER TABLE "registrations" DROP COLUMN "fee_label";
  ALTER TABLE "registrations" DROP COLUMN "fee_amount";
  ALTER TABLE "registrations" DROP COLUMN "fee_currency";
  ALTER TABLE "registrations" DROP COLUMN "fee_exempt";
  ALTER TABLE "registrations" DROP COLUMN "exemption_approved";
  ALTER TABLE "registrations" DROP COLUMN "exemption_approved_by_id";
  ALTER TABLE "registrations" DROP COLUMN "exemption_approved_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payment_proofs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "invitation_letters_id";
  DROP TYPE "public"."enum_registrations_fee_currency";
  DROP TYPE "public"."enum__registrations_v_version_fee_currency";
  DROP TYPE "public"."enum__registrations_v_version_locale";
  DROP TYPE "public"."enum__registrations_v_version_status";
  DROP TYPE "public"."enum_payment_proofs_status";
  DROP TYPE "public"."enum__payment_proofs_v_version_status";
  DROP TYPE "public"."enum_invitation_letters_status";
  DROP TYPE "public"."enum_invitation_letters_eligibility_basis";
  DROP TYPE "public"."enum__invitation_letters_v_version_status";
  DROP TYPE "public"."enum__invitation_letters_v_version_eligibility_basis";
  DROP TYPE "public"."enum_conference_details_payment_proof_formats";`)
}
