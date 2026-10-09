CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid,
	"status" text DEFAULT 'approved' NOT NULL,
	"review_note" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"brand" text NOT NULL,
	"weight_value" double precision NOT NULL,
	"weight_unit" text NOT NULL,
	"volume_value" double precision,
	"volume_unit" text,
	"image_url" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"pet_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"diet_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"nutritional_info" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_status_valid" CHECK ("products"."status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock" >= 0),
	CONSTRAINT "products_price_positive" CHECK ("products"."price" > 0)
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_users_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_pet_types_idx" ON "products" USING gin ("pet_types");--> statement-breakpoint
CREATE INDEX "products_diet_types_idx" ON "products" USING gin ("diet_types");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");