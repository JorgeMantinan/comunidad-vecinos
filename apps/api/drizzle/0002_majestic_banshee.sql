CREATE TABLE "assessment_charges" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"community_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_charges_amount_ck" CHECK (amount > 0),
	CONSTRAINT "assessment_charges_status_ck" CHECK (status in ('pending', 'paid')),
	CONSTRAINT "assessment_charges_paid_requires_date_ck" CHECK ((status = 'paid' AND paid_on IS NOT NULL) OR status = 'pending')
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"concept" text NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_total_amount_ck" CHECK (total_amount > 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"number" text NOT NULL,
	"supplier" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"issued_on" date NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"paid_on" date,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_amount_ck" CHECK (amount > 0),
	CONSTRAINT "invoices_status_ck" CHECK (status in ('received', 'paid')),
	CONSTRAINT "invoices_paid_requires_date_ck" CHECK ((status = 'paid' AND paid_on IS NOT NULL) OR status = 'received')
);
--> statement-breakpoint
ALTER TABLE "assessment_charges" ADD CONSTRAINT "assessment_charges_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_charges" ADD CONSTRAINT "assessment_charges_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_charges" ADD CONSTRAINT "assessment_charges_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_charges_assessment_unit_uq" ON "assessment_charges" USING btree ("assessment_id","unit_id");--> statement-breakpoint
CREATE INDEX "assessment_charges_assessment_idx" ON "assessment_charges" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessments_community_idx" ON "assessments" USING btree ("community_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_community_number_uq" ON "invoices" USING btree ("community_id","number");--> statement-breakpoint
CREATE INDEX "invoices_community_issued_idx" ON "invoices" USING btree ("community_id","issued_on");