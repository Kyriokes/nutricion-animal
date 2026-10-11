CREATE TABLE "product_ingredients" (
	"product_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"percentage" numeric(5, 2),
	CONSTRAINT "product_ingredients_product_id_food_id_pk" PRIMARY KEY("product_id","food_id"),
	CONSTRAINT "product_ingredients_percentage_valid" CHECK ("product_ingredients"."percentage" is null or ("product_ingredients"."percentage" > 0 and "product_ingredients"."percentage" <= 100))
);
--> statement-breakpoint
ALTER TABLE "product_ingredients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_traces" (
	"product_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	CONSTRAINT "product_traces_product_id_food_id_pk" PRIMARY KEY("product_id","food_id")
);
--> statement-breakpoint
ALTER TABLE "product_traces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_traces" ADD CONSTRAINT "product_traces_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_traces" ADD CONSTRAINT "product_traces_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_ingredients_food_idx" ON "product_ingredients" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX "product_traces_food_idx" ON "product_traces" USING btree ("food_id");