CREATE TABLE "theme_palettes" (
	"mode" text PRIMARY KEY NOT NULL,
	"colors" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "theme_palettes_mode_valid" CHECK ("theme_palettes"."mode" in ('light', 'dark'))
);
--> statement-breakpoint
ALTER TABLE "theme_palettes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "theme_palettes" ADD CONSTRAINT "theme_palettes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;