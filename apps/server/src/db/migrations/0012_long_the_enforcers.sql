ALTER TABLE "loyalty_transaction" ADD COLUMN "reversed_transaction_id" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "max_credit_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_reversed_transaction_id_loyalty_transaction_id_fk" FOREIGN KEY ("reversed_transaction_id") REFERENCES "public"."loyalty_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_reversal_per_credit" UNIQUE("reversed_transaction_id");