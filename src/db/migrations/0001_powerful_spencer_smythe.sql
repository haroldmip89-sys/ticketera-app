CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."invited_role" AS ENUM('admin', 'organizer');--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "invited_role" NOT NULL,
	"organizer_display_name" text,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"clerk_invitation_id" text,
	"invited_by" uuid,
	"accepted_user_id" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitations_clerk_invitation_id_unique" UNIQUE("clerk_invitation_id"),
	CONSTRAINT "user_invitations_organizer_name_check" CHECK ("user_invitations"."role" <> 'organizer' OR "user_invitations"."organizer_display_name" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_invitations_pending_email_idx" ON "user_invitations" USING btree (lower("email")) WHERE "user_invitations"."status" = 'pending';