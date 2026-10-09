CREATE TABLE "nutritionist_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"license_number" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nutritionist_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nutritionist_profiles" ADD CONSTRAINT "nutritionist_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;