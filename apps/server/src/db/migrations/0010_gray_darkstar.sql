ALTER TABLE "loyalty_transaction" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD COLUMN "expired_transaction_id" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "points_validity_days" integer;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "brand_primary_color" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "brand_background_color" text;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_expired_transaction_id_loyalty_transaction_id_fk" FOREIGN KEY ("expired_transaction_id") REFERENCES "public"."loyalty_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_expiration_per_credit" UNIQUE("expired_transaction_id");