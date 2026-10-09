CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_positive" CHECK ("order_items"."unit_price" > 0)
);
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_status_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text NOT NULL,
	"actor" text NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_status_changes_actor_valid" CHECK ("order_status_changes"."actor" in ('gateway', 'customer', 'admin', 'system'))
);
--> statement-breakpoint
ALTER TABLE "order_status_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"delivery_address" jsonb NOT NULL,
	"carrier" text NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"shipping_cost" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"reserved_until" timestamp with time zone NOT NULL,
	"payment_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_status_valid" CHECK ("orders"."status" in ('pending_payment', 'paid', 'preparing', 'shipping', 'received', 'rejected', 'cancelled')),
	CONSTRAINT "orders_amounts_valid" CHECK ("orders"."subtotal" > 0 and "orders"."shipping_cost" >= 0 and "orders"."total" = "orders"."subtotal" + "orders"."shipping_cost")
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_changes" ADD CONSTRAINT "order_status_changes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_changes" ADD CONSTRAINT "order_status_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_changes_order_idx" ON "order_status_changes" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_reserved_idx" ON "orders" USING btree ("status","reserved_until");