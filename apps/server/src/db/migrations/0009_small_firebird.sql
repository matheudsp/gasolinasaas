CREATE TABLE "reward" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cost_points" integer NOT NULL,
	"image_url" text,
	"stock" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_redemption" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reward_id" text NOT NULL,
	"cost_points" integer NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"operator_user_id" text,
	"expires_at" timestamp NOT NULL,
	"fulfilled_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "reward_redemption_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD COLUMN "redemption_id" text;--> statement-breakpoint
ALTER TABLE "reward" ADD CONSTRAINT "reward_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemption" ADD CONSTRAINT "reward_redemption_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemption" ADD CONSTRAINT "reward_redemption_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemption" ADD CONSTRAINT "reward_redemption_reward_id_reward_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."reward"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemption" ADD CONSTRAINT "reward_redemption_operator_user_id_user_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reward_redemption_user_idx" ON "reward_redemption" USING btree ("tenant_id","user_id");--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_redemption_id_reward_redemption_id_fk" FOREIGN KEY ("redemption_id") REFERENCES "public"."reward_redemption"("id") ON DELETE set null ON UPDATE no action;