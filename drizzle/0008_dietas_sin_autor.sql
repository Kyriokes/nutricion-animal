ALTER TABLE "diets" DROP CONSTRAINT "diets_nutritionist_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "diets" ALTER COLUMN "nutritionist_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "diets" ADD CONSTRAINT "diets_nutritionist_id_users_id_fk" FOREIGN KEY ("nutritionist_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;