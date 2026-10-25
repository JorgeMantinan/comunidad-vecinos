ALTER TABLE "professionals" DROP CONSTRAINT "professionals_recommended_by_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "professionals" DROP COLUMN "recommended_by_id";