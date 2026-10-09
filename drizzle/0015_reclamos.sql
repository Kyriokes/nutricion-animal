CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"description" text NOT NULL,
	"resolution" text,
	"resolution_note" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claims_status_valid" CHECK ("claims"."status" in ('open', 'in_review', 'resolved')),
	CONSTRAINT "claims_resolution_valid" CHECK ("claims"."resolution" is null or "claims"."resolution" in ('refund', 'resend', 'no_change')),
	CONSTRAINT "claims_resolved_has_resolution" CHECK (("claims"."status" = 'resolved') = ("claims"."resolution" is not null))
);
--> statement-breakpoint
ALTER TABLE "claims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_order_idx" ON "claims" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status","created_at");