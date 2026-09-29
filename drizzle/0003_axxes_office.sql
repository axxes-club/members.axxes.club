-- AXXES Office: documents, spreadsheets and decks, plus revisions and the
-- hand-off link to DAM assets.
--
-- Written by hand to match src/lib/db/schema/office.ts, the same way 0001 and
-- 0002 were. Every statement is guarded so re-running is a no-op: this is a
-- shared database that three apps read, and a deploy should never fail
-- half-way because a table already existed.

CREATE TABLE IF NOT EXISTS "office_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "kind" text DEFAULT 'doc' NOT NULL,
  "title" text NOT NULL,
  "folder" text,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "starred" boolean DEFAULT false NOT NULL,
  "created_by_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "office_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "office_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "content" jsonb NOT NULL,
  "title" text,
  "summary" text,
  "created_by_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "office_revisions_document_id_office_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "office_documents"("id") ON DELETE cascade,
  CONSTRAINT "office_revisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade
);

-- One link table for the whole suite, not one per app. Folders cannot join onto
-- tables it does not own, so it holds (asset, app_key, record_id) and resolves
-- the record through a small per-app URL registry.
CREATE TABLE IF NOT EXISTS "asset_app_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "app_key" text NOT NULL,
  "record_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "asset_app_links_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade,
  CONSTRAINT "asset_app_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "office_documents_tenant_idx" ON "office_documents" ("tenant_id");
CREATE INDEX IF NOT EXISTS "office_documents_kind_idx" ON "office_documents" ("tenant_id", "kind");
CREATE INDEX IF NOT EXISTS "office_documents_folder_idx" ON "office_documents" ("tenant_id", "folder");
CREATE INDEX IF NOT EXISTS "office_documents_updated_idx" ON "office_documents" ("tenant_id", "updated_at");
CREATE INDEX IF NOT EXISTS "office_documents_created_by_idx" ON "office_documents" ("created_by_id");

CREATE INDEX IF NOT EXISTS "office_revisions_document_idx" ON "office_revisions" ("document_id", "created_at");
CREATE INDEX IF NOT EXISTS "office_revisions_tenant_idx" ON "office_revisions" ("tenant_id");

CREATE INDEX IF NOT EXISTS "asset_app_links_record_idx" ON "asset_app_links" ("app_key", "record_id");
CREATE INDEX IF NOT EXISTS "asset_app_links_tenant_idx" ON "asset_app_links" ("tenant_id");

-- One record per app per asset: re-linking replaces the row instead of stacking
-- duplicates that would each claim to be the live one.
DO $$ BEGIN
  ALTER TABLE "asset_app_links" ADD CONSTRAINT "asset_app_links_asset_app_idx" UNIQUE ("asset_id", "app_key");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- The earlier, Office-only table. Superseded by asset_app_links; dropped so
-- there is one mechanism rather than two that can disagree.
DROP TABLE IF EXISTS "office_asset_links";

-- Available to every workspace by design: there is no per-tenant opt-in
-- column, because AXXES Office is not a paid module.
COMMENT ON TABLE "office_documents" IS 'AXXES Office files. Available to all tenants; no module gate.';
COMMENT ON TABLE "asset_app_links" IS 'A file in Folders linked to a record in another AXXES app. app_key is a catalog key.';

-- Register the line in the shared product catalog so every app's launcher
-- offers it, instead of each app keeping its own list. Guarded on the table
-- existing, so this migration does not have to land after the catalog's own.
DO $$
BEGIN
  IF to_regclass('axxes_product') IS NOT NULL THEN
    INSERT INTO "axxes_product" (
      "key", "name", "tagline", "description", "url", "color", "category",
      "status", "sso", "icon", "members_path", "surface_in_members", "sort_order",
      "created_at", "updated_at"
    ) VALUES (
      'office',
      'AXXES Office',
      'Documents, spreadsheets and decks, in your workspace.',
      'An office suite from AXXES: Quill for documents, Tally for spreadsheets, Stage for presentations. Files live in workspace folders, open in place from AXXES Folders, and are available to every member.',
      'https://quill.axxes.club',
      '#5b8cff',
      'Work',
      'beta',
      true,
      'FileText',
      '/office',
      true,
      20,
      now(),
      now()
    )
    ON CONFLICT ("key") DO UPDATE SET
      "name" = EXCLUDED."name",
      "tagline" = EXCLUDED."tagline",
      "description" = EXCLUDED."description",
      "url" = EXCLUDED."url",
      "color" = EXCLUDED."color",
      "category" = EXCLUDED."category",
      "status" = EXCLUDED."status",
      "icon" = EXCLUDED."icon",
      "members_path" = EXCLUDED."members_path",
      "surface_in_members" = EXCLUDED."surface_in_members",
      "updated_at" = now();
  END IF;
END $$;
