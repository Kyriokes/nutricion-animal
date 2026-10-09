CREATE TABLE "diet_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"diet_version_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "diet_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diet_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"diet_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diet_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nutritionist_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "diet_assignments" ADD CONSTRAINT "diet_assignments_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_assignments" ADD CONSTRAINT "diet_assignments_diet_version_id_diet_versions_id_fk" FOREIGN KEY ("diet_version_id") REFERENCES "public"."diet_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_versions" ADD CONSTRAINT "diet_versions_diet_id_diets_id_fk" FOREIGN KEY ("diet_id") REFERENCES "public"."diets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diets" ADD CONSTRAINT "diets_nutritionist_id_users_id_fk" FOREIGN KEY ("nutritionist_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diet_assignments_pet_idx" ON "diet_assignments" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "diet_assignments_version_idx" ON "diet_assignments" USING btree ("diet_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diet_versions_number_unique" ON "diet_versions" USING btree ("diet_id","number");--> statement-breakpoint
CREATE INDEX "diets_nutritionist_idx" ON "diets" USING btree ("nutritionist_id");