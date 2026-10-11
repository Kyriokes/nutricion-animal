CREATE TABLE "pet_foods" (
	"pet_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "pet_foods_pet_id_food_id_kind_pk" PRIMARY KEY("pet_id","food_id","kind"),
	CONSTRAINT "pet_foods_kind_valid" CHECK ("pet_foods"."kind" in ('allergy', 'forbidden', 'required'))
);
--> statement-breakpoint
ALTER TABLE "pet_foods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pet_foods" ADD CONSTRAINT "pet_foods_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_foods" ADD CONSTRAINT "pet_foods_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pet_foods_food_idx" ON "pet_foods" USING btree ("food_id");