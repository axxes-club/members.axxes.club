-- Projects module migration
-- Creates tables for kanban-style project management

-- Create enums
DO $$ BEGIN
    CREATE TYPE "project_visibility" AS ENUM ('private', 'public', 'team');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "project_status" AS ENUM ('active', 'archived', 'completed', 'on_hold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "card_priority" AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Projects table
CREATE TABLE IF NOT EXISTS "projects" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "slug" text NOT NULL,
    "visibility" "project_visibility" NOT NULL DEFAULT 'team',
    "status" "project_status" NOT NULL DEFAULT 'active',
    "color" text,
    "icon" text,
    "is_template" boolean DEFAULT false,
    "source_project_id" uuid,
    "start_date" timestamp with time zone,
    "due_date" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by_id" text REFERENCES "user"("id"),
    "archived_by_id" text REFERENCES "user"("id"),
    "settings" jsonb DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "archived_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "projects_tenant_idx" ON "projects"("tenant_id");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "projects_slug_idx" ON "projects"("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "projects_created_by_idx" ON "projects"("created_by_id");

-- Project Lists table
CREATE TABLE IF NOT EXISTS "project_lists" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "color" text,
    "position" integer NOT NULL DEFAULT 0,
    "wip_limit" integer,
    "is_done_list" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "project_lists_project_idx" ON "project_lists"("project_id");
CREATE INDEX IF NOT EXISTS "project_lists_position_idx" ON "project_lists"("project_id", "position");

-- Project Cards table
CREATE TABLE IF NOT EXISTS "project_cards" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "list_id" uuid NOT NULL REFERENCES "project_lists"("id") ON DELETE CASCADE,
    "title" text NOT NULL,
    "description" text,
    "position" integer NOT NULL DEFAULT 0,
    "priority" "card_priority" DEFAULT 'medium',
    "due_date" timestamp with time zone,
    "start_date" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "estimated_hours" integer,
    "logged_hours" integer DEFAULT 0,
    "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
    "created_by_id" text REFERENCES "user"("id"),
    "completed_by_id" text REFERENCES "user"("id"),
    "custom_fields" jsonb DEFAULT '{}',
    "cover_image_url" text,
    "cover_color" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "completed_at_timestamp" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "project_cards_project_idx" ON "project_cards"("project_id");
CREATE INDEX IF NOT EXISTS "project_cards_list_idx" ON "project_cards"("list_id");
CREATE INDEX IF NOT EXISTS "project_cards_contact_idx" ON "project_cards"("contact_id");
CREATE INDEX IF NOT EXISTS "project_cards_due_date_idx" ON "project_cards"("project_id", "due_date");
CREATE INDEX IF NOT EXISTS "project_cards_position_idx" ON "project_cards"("list_id", "position");

-- Project Labels table
CREATE TABLE IF NOT EXISTS "project_labels" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "color" text NOT NULL DEFAULT '#6366f1',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_labels_project_idx" ON "project_labels"("project_id");

-- Card to Label mapping
CREATE TABLE IF NOT EXISTS "project_card_labels" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "card_id" uuid NOT NULL REFERENCES "project_cards"("id") ON DELETE CASCADE,
    "label_id" uuid NOT NULL REFERENCES "project_labels"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_card_labels_card_idx" ON "project_card_labels"("card_id");
CREATE INDEX IF NOT EXISTS "project_card_labels_label_idx" ON "project_card_labels"("label_id");

-- Card Members mapping
CREATE TABLE IF NOT EXISTS "project_card_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "card_id" uuid NOT NULL REFERENCES "project_cards"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_card_members_card_idx" ON "project_card_members"("card_id");
CREATE INDEX IF NOT EXISTS "project_card_members_user_idx" ON "project_card_members"("user_id");

-- Project Checklists table
CREATE TABLE IF NOT EXISTS "project_checklists" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "card_id" uuid NOT NULL REFERENCES "project_cards"("id") ON DELETE CASCADE,
    "title" text NOT NULL,
    "position" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_checklists_card_idx" ON "project_checklists"("card_id");

-- Checklist Items table
CREATE TABLE IF NOT EXISTS "project_checklist_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "checklist_id" uuid NOT NULL REFERENCES "project_checklists"("id") ON DELETE CASCADE,
    "text" text NOT NULL,
    "position" integer NOT NULL DEFAULT 0,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "completed_by_id" text REFERENCES "user"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_checklist_items_checklist_idx" ON "project_checklist_items"("checklist_id");

-- Card Comments table
CREATE TABLE IF NOT EXISTS "project_card_comments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "card_id" uuid NOT NULL REFERENCES "project_cards"("id") ON DELETE CASCADE,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id"),
    "parent_comment_id" uuid REFERENCES "project_card_comments"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "project_card_comments_card_idx" ON "project_card_comments"("card_id");
CREATE INDEX IF NOT EXISTS "project_card_comments_tenant_idx" ON "project_card_comments"("tenant_id");
CREATE INDEX IF NOT EXISTS "project_card_comments_user_idx" ON "project_card_comments"("user_id");

-- Project Activity Log table
CREATE TABLE IF NOT EXISTS "project_activity" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "card_id" uuid REFERENCES "project_cards"("id") ON DELETE SET NULL,
    "list_id" uuid REFERENCES "project_lists"("id") ON DELETE SET NULL,
    "type" text NOT NULL,
    "description" text,
    "previous_value" jsonb,
    "new_value" jsonb,
    "user_id" text REFERENCES "user"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_activity_project_idx" ON "project_activity"("project_id");
CREATE INDEX IF NOT EXISTS "project_activity_tenant_idx" ON "project_activity"("tenant_id");
CREATE INDEX IF NOT EXISTS "project_activity_card_idx" ON "project_activity"("card_id");
CREATE INDEX IF NOT EXISTS "project_activity_created_at_idx" ON "project_activity"("created_at");

-- Project Members table
CREATE TABLE IF NOT EXISTS "project_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role" text NOT NULL DEFAULT 'member',
    "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
    "invited_by_id" text REFERENCES "user"("id")
);

CREATE INDEX IF NOT EXISTS "project_members_project_idx" ON "project_members"("project_id");
CREATE INDEX IF NOT EXISTS "project_members_user_idx" ON "project_members"("user_id");