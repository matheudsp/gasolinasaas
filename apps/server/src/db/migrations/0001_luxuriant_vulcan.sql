CREATE TABLE "fuel" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "fuel_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" text PRIMARY KEY NOT NULL,
	"station_fuel_id" text NOT NULL,
	"previous_price" numeric(10, 3),
	"new_price" numeric(10, 3) NOT NULL,
	"changed_at" timestamp NOT NULL,
	"changed_by_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"wifi" boolean DEFAULT false NOT NULL,
	"accessibility" boolean DEFAULT false NOT NULL,
	"convenience_store" boolean DEFAULT false NOT NULL,
	"restaurant" boolean DEFAULT false NOT NULL,
	"electric_charging" boolean DEFAULT false NOT NULL,
	"car_wash" boolean DEFAULT false NOT NULL,
	"open24h" boolean DEFAULT false NOT NULL,
	"tire_pressure" boolean DEFAULT false NOT NULL,
	"bathroom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station_fuel" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"fuel_id" text NOT NULL,
	"current_price" numeric(10, 3) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "unique_station_fuel" UNIQUE("station_id","fuel_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_membership" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tenant_membership" ALTER COLUMN "role" SET DEFAULT 'owner'::text;--> statement-breakpoint
DROP TYPE "public"."tenant_role";--> statement-breakpoint
CREATE TYPE "public"."tenant_role" AS ENUM('owner');--> statement-breakpoint
ALTER TABLE "tenant_membership" ALTER COLUMN "role" SET DEFAULT 'owner'::"public"."tenant_role";--> statement-breakpoint
ALTER TABLE "tenant_membership" ALTER COLUMN "role" SET DATA TYPE "public"."tenant_role" USING "role"::"public"."tenant_role";--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_station_fuel_id_station_fuel_id_fk" FOREIGN KEY ("station_fuel_id") REFERENCES "public"."station_fuel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changed_by_id_user_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station" ADD CONSTRAINT "station_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_fuel" ADD CONSTRAINT "station_fuel_station_id_station_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."station"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_fuel" ADD CONSTRAINT "station_fuel_fuel_id_fuel_id_fk" FOREIGN KEY ("fuel_id") REFERENCES "public"."fuel"("id") ON DELETE cascade ON UPDATE no action;