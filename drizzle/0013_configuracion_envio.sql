CREATE TABLE "shop_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"shipping_cost" numeric(12, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "shop_settings_single_row" CHECK ("shop_settings"."id" = 1),
	CONSTRAINT "shop_settings_shipping_cost_positive" CHECK ("shop_settings"."shipping_cost" > 0)
);
--> statement-breakpoint
ALTER TABLE "shop_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shop_settings" ADD CONSTRAINT "shop_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;