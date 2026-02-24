-- Matrix Chat Integration Tables
-- This migration adds support for Matrix-based messaging

-- Matrix user accounts - links our users to Matrix accounts
CREATE TABLE IF NOT EXISTS "matrix_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "matrix_user_id" text NOT NULL UNIQUE,
  "homeserver" text NOT NULL DEFAULT 'matrix.org',
  "access_token" text NOT NULL,
  "device_id" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matrix_accounts_user_idx" ON "matrix_accounts"("user_id");
CREATE INDEX IF NOT EXISTS "matrix_accounts_matrix_user_idx" ON "matrix_accounts"("matrix_user_id");

-- Matrix Spaces for tenants (like Slack workspaces)
CREATE TABLE IF NOT EXISTS "matrix_spaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "room_id" text NOT NULL UNIQUE,
  "is_encrypted" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matrix_spaces_tenant_idx" ON "matrix_spaces"("tenant_id");
CREATE INDEX IF NOT EXISTS "matrix_spaces_room_idx" ON "matrix_spaces"("room_id");

-- Matrix rooms (channels and DMs)
CREATE TABLE IF NOT EXISTS "matrix_rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "space_id" uuid REFERENCES "matrix_spaces"("id") ON DELETE CASCADE,
  "room_id" text NOT NULL UNIQUE,
  "type" text NOT NULL DEFAULT 'channel',
  "name" text,
  "topic" text,
  "avatar_url" text,
  "is_encrypted" boolean NOT NULL DEFAULT false,
  "is_public" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matrix_rooms_tenant_idx" ON "matrix_rooms"("tenant_id");
CREATE INDEX IF NOT EXISTS "matrix_rooms_space_idx" ON "matrix_rooms"("space_id");
CREATE INDEX IF NOT EXISTS "matrix_rooms_room_idx" ON "matrix_rooms"("room_id");
CREATE INDEX IF NOT EXISTS "matrix_rooms_type_idx" ON "matrix_rooms"("type");

-- Room membership for users
CREATE TABLE IF NOT EXISTS "matrix_room_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "room_id" uuid NOT NULL REFERENCES "matrix_rooms"("id") ON DELETE CASCADE,
  "matrix_account_id" uuid NOT NULL REFERENCES "matrix_accounts"("id") ON DELETE CASCADE,
  "membership" text NOT NULL DEFAULT 'join',
  "is_muted" boolean NOT NULL DEFAULT false,
  "notification_mode" text NOT NULL DEFAULT 'all',
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matrix_room_members_room_idx" ON "matrix_room_members"("room_id");
CREATE INDEX IF NOT EXISTS "matrix_room_members_account_idx" ON "matrix_room_members"("matrix_account_id");