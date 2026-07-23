CREATE TABLE "loyalty_campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"multiplier" numeric(4, 2) NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loyalty_campaign" ADD CONSTRAINT "loyalty_campaign_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loyalty_campaign_tenant_idx" ON "loyalty_campaign" USING btree ("tenant_id");