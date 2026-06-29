import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../lib/orpc";
import { fuelRouter } from "./fuel";
import { stationRouter } from "./station";
import { tenantRouter } from "./tenant";
import { adminRouter } from "./admin";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  station: stationRouter,
  fuel: fuelRouter,
  tenant: tenantRouter,
   admin: adminRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;