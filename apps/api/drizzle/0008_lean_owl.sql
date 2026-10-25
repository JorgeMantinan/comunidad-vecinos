CREATE TABLE "sponsorship_communities" (
	"sponsorship_id" text NOT NULL,
	"community_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sponsorship_communities_pk" PRIMARY KEY("sponsorship_id","community_id")
);
--> statement-breakpoint
CREATE TABLE "sponsorships" (
	"id" text PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"website" text,
	"contact_email" text,
	"monthly_amount" numeric(10, 2),
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sponsorship_communities" ADD CONSTRAINT "sponsorship_communities_sponsorship_id_sponsorships_id_fk" FOREIGN KEY ("sponsorship_id") REFERENCES "public"."sponsorships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_communities" ADD CONSTRAINT "sponsorship_communities_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sponsorship_communities_sponsorship_idx" ON "sponsorship_communities" USING btree ("sponsorship_id");--> statement-breakpoint
CREATE INDEX "sponsorship_communities_community_idx" ON "sponsorship_communities" USING btree ("community_id");