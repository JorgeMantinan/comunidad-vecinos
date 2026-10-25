CREATE TABLE "document_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence" text;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_templates_community_idx" ON "document_templates" USING btree ("community_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurrence_ck" CHECK (recurrence is null or recurrence in ('monthly', 'quarterly', 'yearly'));