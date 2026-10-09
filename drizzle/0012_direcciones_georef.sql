ALTER TABLE "addresses" ADD COLUMN "verification" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "province_id" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "georef_label" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_verification_valid" CHECK ("addresses"."verification" in ('verified', 'not_found', 'unverified'));