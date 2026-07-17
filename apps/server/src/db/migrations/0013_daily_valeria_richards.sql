ALTER TABLE "user" ADD COLUMN "cpf" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_cpf_unique" UNIQUE("cpf");