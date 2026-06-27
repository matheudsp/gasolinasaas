import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { listTenants } from "@/api/tenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, CreditCard, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: listTenants,
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "trial":
        return "warning";
      case "inactive":
      case "suspended":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.full_name}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your multi-tenant platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Tenants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants.filter((t) => t.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {user?.is_superadmin ? "Superadmin" : "User"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Tenants</h2>
          <Button asChild size="sm">
            <Link to="/tenants">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading tenants...
          </div>
        ) : tenants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8 text-center">
              <Building2 className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No tenants yet</p>
              <Button asChild className="mt-4">
                <Link to="/tenants">Create your first tenant</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{tenant.name}</CardTitle>
                    <Badge variant={statusColor(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Slug: {tenant.slug}</p>
                  <p>Schema: {tenant.schema_name}</p>
                  <Button variant="link" size="sm" className="mt-2 p-0" asChild>
                    <Link to={`/tenants/${tenant.id}`}>
                      Manage tenant <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
