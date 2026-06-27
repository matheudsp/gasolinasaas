// import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import data from "@/configs/dashboard.json" with { type: "json" };
import { authClient } from "@/lib/auth/auth-client";
// import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/(dashboard)/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/auth/$authView",
        params: {
          authView: "login",
        },
        throw: true,
      });
    }
    return { session };
  },
});

function RouteComponent() {
  // const { session } = Route.useRouteContext();

  // const privateData = useQuery(orpc.privateData.queryOptions());

  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
            <DataTable data={data} />
          </div>
        </div>
      </div>
    </>
  );
}
