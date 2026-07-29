ALTER TABLE "loyalty_transaction" ADD COLUMN "reversed_redemption_id" text;--> statement-breakpoint
ALTER TABLE "reward_redemption" ADD COLUMN "reversed_at" timestamp;--> statement-breakpoint
ALTER TABLE "reward_redemption" ADD COLUMN "reversal_reason" text;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_reversed_redemption_id_reward_redemption_id_fk" FOREIGN KEY ("reversed_redemption_id") REFERENCES "public"."reward_redemption"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_reversal_per_redemption" UNIQUE("reversed_redemption_id");