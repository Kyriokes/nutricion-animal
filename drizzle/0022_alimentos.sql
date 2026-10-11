CREATE TABLE "food_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"food_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"normalized" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "foods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_aliases" ADD CONSTRAINT "food_aliases_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "food_aliases_normalized_unique" ON "food_aliases" USING btree ("normalized");--> statement-breakpoint
CREATE INDEX "food_aliases_food_idx" ON "food_aliases" USING btree ("food_id");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_normalized_unique" ON "foods" USING btree ("normalized");