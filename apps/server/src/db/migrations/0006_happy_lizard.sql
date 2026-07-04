CREATE TABLE "push_notification_recipient" (
	"id" text PRIMARY KEY NOT NULL,
	"notification_id" text NOT NULL,
	"user_id" text NOT NULL,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "unique_notification_recipient" UNIQUE("notification_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "push_notification_recipient" ADD CONSTRAINT "push_notification_recipient_notification_id_push_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."push_notification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification_recipient" ADD CONSTRAINT "push_notification_recipient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_notification_recipient_user_idx" ON "push_notification_recipient" USING btree ("user_id");