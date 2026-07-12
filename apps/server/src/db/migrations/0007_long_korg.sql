ALTER TYPE "public"."tenant_role" ADD VALUE 'operator';--> statement-breakpoint
CREATE TABLE "loyalty_scan_code" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "loyalty_scan_code_code_unique" UNIQUE("code"),
	CONSTRAINT "unique_scan_code_per_customer" UNIQUE("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"operator_user_id" text,
	"points" integer NOT NULL,
	"amount_cents" integer,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "points_per_real" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_scan_code" ADD CONSTRAINT "loyalty_scan_code_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_scan_code" ADD CONSTRAINT "loyalty_scan_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_operator_user_id_user_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loyalty_transaction_user_idx" ON "loyalty_transaction" USING btree ("tenant_id","user_id");