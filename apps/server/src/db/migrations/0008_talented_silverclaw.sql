ALTER TABLE "tenant" ALTER COLUMN "points_per_real" SET DATA TYPE numeric(6, 2);--> statement-breakpoint
ALTER TABLE "tenant" ALTER COLUMN "points_per_real" SET DEFAULT '1';