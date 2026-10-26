CREATE TABLE "fee_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"tariff_id" text,
	"unit_id" text NOT NULL,
	"period" text NOT NULL,
	"concept" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_charges_amount_ck" CHECK (amount > 0),
	CONSTRAINT "fee_charges_period_ck" CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "fee_charges_status_ck" CHECK (status in ('pending','paid')),
	CONSTRAINT "fee_charges_paid_requires_date_ck" CHECK ((status = 'paid' AND paid_on IS NOT NULL) OR status = 'pending')
);
--> statement-breakpoint
CREATE TABLE "fee_tariffs" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"concept" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"target" text DEFAULT 'all' NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"anchor_period" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_tariffs_amount_ck" CHECK (amount > 0),
	CONSTRAINT "fee_tariffs_target_ck" CHECK (target in ('all','vivienda','garaje','trastero','local','buzon','plaza')),
	CONSTRAINT "fee_tariffs_frequency_ck" CHECK (frequency in ('monthly','quarterly','yearly')),
	CONSTRAINT "fee_tariffs_anchor_ck" CHECK (anchor_period ~ '^\d{4}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "kind" text DEFAULT 'vivienda' NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_tariff_id_fee_tariffs_id_fk" FOREIGN KEY ("tariff_id") REFERENCES "public"."fee_tariffs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_tariffs" ADD CONSTRAINT "fee_tariffs_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_tariffs" ADD CONSTRAINT "fee_tariffs_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fee_charges_unit_concept_period_uq" ON "fee_charges" USING btree ("community_id","unit_id","concept","period");--> statement-breakpoint
CREATE INDEX "fee_charges_community_period_idx" ON "fee_charges" USING btree ("community_id","period");--> statement-breakpoint
CREATE INDEX "fee_charges_unit_idx" ON "fee_charges" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "fee_tariffs_community_idx" ON "fee_tariffs" USING btree ("community_id");--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_kind_ck" CHECK (kind in ('vivienda','garaje','trastero','local','buzon','plaza'));