import { IconArrowLeft } from "@tabler/icons-react";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(auth)/auth")({
  component: RouteComponent,
});

function RouteComponent() {
  // hide back button on callback page
  const showBackButton = useLocation().pathname !== "/auth/callback";

  return (
    <div className="flex h-screen flex-1 p-4">
      {/* back button */}
      {showBackButton && (
        <Link to="/">
          <Button variant="outline">
            <IconArrowLeft />
          </Button>
        </Link>
      )}
      <Outlet />
    </div>
  );
}
