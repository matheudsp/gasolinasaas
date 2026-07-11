import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../lib/orpc";
import { fuelRouter } from "./fuel";
import { stationRouter } from "./station";
import { subscriptionRouter } from "./subscription";
import { tenantRouter } from "./tenant";
import { adminRouter } from "./admin";
import { pushRouter } from "./push";
import { userRouter } from "./users";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  station: stationRouter,
  fuel: fuelRouter,
  tenant: tenantRouter,
  admin: adminRouter,
  subscription: subscriptionRouter,
  push: pushRouter,
  user: userRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;