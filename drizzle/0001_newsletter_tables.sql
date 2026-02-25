-- Newsletter Enums
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."newsletter_event" AS ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."list_type" AS ENUM('public', 'private');--> statement-breakpoint

-- Subscriber Lists
CREATE TABLE "subscriber_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" varchar(100) NOT NULL,
	"type" "list_type" NOT NULL DEFAULT 'public',
	"double_opt_in" boolean DEFAULT true,
	"send_welcome_email" boolean DEFAULT false,
	"welcome_email_template_id" uuid,
	"subscriber_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint

-- List Memberships
CREATE TABLE "list_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'subscribed',
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"unsubscribe_reason" text,
	"opt_in_token" varchar(64),
	"opt_in_confirmed_at" timestamp with time zone,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Email Templates
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"html_content" text NOT NULL,
	"text_content" text,
	"type" varchar(20) DEFAULT 'campaign',
	"from_name" text,
	"from_email" text,
	"reply_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint

-- Newsletter Campaigns
CREATE TABLE "newsletter_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"html_content" text,
	"text_content" text,
	"template_id" uuid,
	"from_name" text,
	"from_email" text,
	"reply_to" text,
	"status" "campaign_status" NOT NULL DEFAULT 'draft',
	"list_ids" uuid[] DEFAULT '{}',
	"segment_ids" uuid[] DEFAULT '{}',
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"delivered_count" integer DEFAULT 0,
	"opened_count" integer DEFAULT 0,
	"clicked_count" integer DEFAULT 0,
	"bounced_count" integer DEFAULT 0,
	"unsubscribed_count" integer DEFAULT 0,
	"complained_count" integer DEFAULT 0,
	"tracking_enabled" boolean DEFAULT true,
	"click_tracking_enabled" boolean DEFAULT true,
	"open_tracking_enabled" boolean DEFAULT true,
	"archive_url" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint

-- Newsletter Sends
CREATE TABLE "newsletter_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"list_id" uuid,
	"to_email" text NOT NULL,
	"external_id" text,
	"tracking_token" varchar(64) NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'pending',
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"first_opened_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"first_clicked_at" timestamp with time zone,
	"open_count" integer DEFAULT 0,
	"click_count" integer DEFAULT 0,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Newsletter Events
CREATE TABLE "newsletter_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid,
	"send_id" uuid,
	"contact_id" uuid,
	"event" "newsletter_event" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"url" text,
	"link_id" text,
	"bounce_type" text,
	"bounce_reason" text,
	"user_agent" text,
	"ip_address" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Newsletter Settings
CREATE TABLE "newsletter_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email_provider" varchar(20) DEFAULT 'smtp',
	"default_from_name" text,
	"default_from_email" text,
	"default_reply_to" text,
	"resend_api_key" text,
	"sendgrid_api_key" text,
	"mailgun_api_key" text,
	"mailgun_domain" text,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_user" text,
	"smtp_password" text,
	"smtp_secure" boolean DEFAULT true,
	"open_tracking_enabled" boolean DEFAULT true,
	"click_tracking_enabled" boolean DEFAULT true,
	"unsubscribe_page_url" text,
	"logo_url" text,
	"brand_color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_settings_tenant_id_unique" UNIQUE("tenant_id")
);--> statement-breakpoint

-- Tracked Links
CREATE TABLE "tracked_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"original_url" text NOT NULL,
	"link_token" varchar(32) NOT NULL,
	"click_count" integer DEFAULT 0,
	"unique_click_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Foreign Keys for subscriber_lists
ALTER TABLE "subscriber_lists" ADD CONSTRAINT "subscriber_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Foreign Keys for list_memberships
ALTER TABLE "list_memberships" ADD CONSTRAINT "list_memberships_list_id_subscriber_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."subscriber_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_memberships" ADD CONSTRAINT "list_memberships_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Foreign Keys for email_templates
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Foreign Keys for newsletter_campaigns
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Foreign Keys for newsletter_sends
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_campaign_id_newsletter_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."newsletter_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_list_id_subscriber_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."subscriber_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Foreign Keys for newsletter_events
ALTER TABLE "newsletter_events" ADD CONSTRAINT "newsletter_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_events" ADD CONSTRAINT "newsletter_events_campaign_id_newsletter_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."newsletter_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_events" ADD CONSTRAINT "newsletter_events_send_id_newsletter_sends_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."newsletter_sends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_events" ADD CONSTRAINT "newsletter_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Foreign Keys for newsletter_settings
ALTER TABLE "newsletter_settings" ADD CONSTRAINT "newsletter_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Foreign Keys for tracked_links
ALTER TABLE "tracked_links" ADD CONSTRAINT "tracked_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_links" ADD CONSTRAINT "tracked_links_campaign_id_newsletter_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."newsletter_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Indexes for subscriber_lists
CREATE INDEX "subscriber_lists_tenant_idx" ON "subscriber_lists" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscriber_lists_slug_idx" ON "subscriber_lists" USING btree ("tenant_id", "slug");--> statement-breakpoint

-- Indexes for list_memberships
CREATE INDEX "list_memberships_list_idx" ON "list_memberships" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "list_memberships_contact_idx" ON "list_memberships" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "list_memberships_status_idx" ON "list_memberships" USING btree ("list_id", "status");--> statement-breakpoint
CREATE INDEX "list_memberships_optin_idx" ON "list_memberships" USING btree ("opt_in_token");--> statement-breakpoint

-- Indexes for email_templates
CREATE INDEX "email_templates_tenant_idx" ON "email_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "email_templates_type_idx" ON "email_templates" USING btree ("tenant_id", "type");--> statement-breakpoint

-- Indexes for newsletter_campaigns
CREATE INDEX "campaigns_tenant_idx" ON "newsletter_campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "newsletter_campaigns" USING btree ("tenant_id", "status");--> statement-breakpoint
CREATE INDEX "campaigns_scheduled_idx" ON "newsletter_campaigns" USING btree ("scheduled_at");--> statement-breakpoint

-- Indexes for newsletter_sends
CREATE INDEX "sends_tenant_idx" ON "newsletter_sends" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sends_campaign_idx" ON "newsletter_sends" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "sends_contact_idx" ON "newsletter_sends" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "sends_token_idx" ON "newsletter_sends" USING btree ("tracking_token");--> statement-breakpoint
CREATE INDEX "sends_external_idx" ON "newsletter_sends" USING btree ("external_id");--> statement-breakpoint

-- Indexes for newsletter_events
CREATE INDEX "newsletter_events_tenant_idx" ON "newsletter_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "newsletter_events_campaign_idx" ON "newsletter_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "newsletter_events_send_idx" ON "newsletter_events" USING btree ("send_id");--> statement-breakpoint
CREATE INDEX "newsletter_events_contact_idx" ON "newsletter_events" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "newsletter_events_event_idx" ON "newsletter_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "newsletter_events_occurred_idx" ON "newsletter_events" USING btree ("occurred_at");--> statement-breakpoint

-- Indexes for newsletter_settings
CREATE INDEX "newsletter_settings_tenant_idx" ON "newsletter_settings" USING btree ("tenant_id");--> statement-breakpoint

-- Indexes for tracked_links
CREATE INDEX "tracked_links_token_idx" ON "tracked_links" USING btree ("link_token");--> statement-breakpoint
CREATE INDEX "tracked_links_campaign_idx" ON "tracked_links" USING btree ("campaign_id");