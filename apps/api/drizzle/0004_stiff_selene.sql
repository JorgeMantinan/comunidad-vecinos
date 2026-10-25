CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"location" text,
	"status" text DEFAULT 'operational' NOT NULL,
	"warranty_until" date,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_category_ck" CHECK (category in ('elevator', 'plumbing', 'electrical', 'heating', 'common_area', 'other')),
	CONSTRAINT "assets_status_ck" CHECK (status in ('operational', 'maintenance', 'broken'))
);
--> statement-breakpoint
CREATE TABLE "maintenance_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"provider" text NOT NULL,
	"service" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"start_on" date NOT NULL,
	"renewal_on" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_contracts_amount_ck" CHECK (amount > 0),
	CONSTRAINT "maintenance_contracts_dates_ck" CHECK (renewal_on >= start_on),
	CONSTRAINT "maintenance_contracts_status_ck" CHECK (status in ('active', 'ended'))
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"name" text NOT NULL,
	"trade" text NOT NULL,
	"phone" text,
	"email" text,
	"notes" text,
	"recommended_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_contracts" ADD CONSTRAINT "maintenance_contracts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_contracts" ADD CONSTRAINT "maintenance_contracts_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_recommended_by_id_user_id_fk" FOREIGN KEY ("recommended_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_community_category_idx" ON "assets" USING btree ("community_id","category");--> statement-breakpoint
CREATE INDEX "maintenance_contracts_community_status_idx" ON "maintenance_contracts" USING btree ("community_id","status");--> statement-breakpoint
CREATE INDEX "professionals_community_trade_idx" ON "professionals" USING btree ("community_id","trade");