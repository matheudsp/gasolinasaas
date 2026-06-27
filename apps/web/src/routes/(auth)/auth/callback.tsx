import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth/auth-client";

export const Route = createFileRoute("/(auth)/auth/callback")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const maxAttempts = 10;
      const interval = 300;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const session = await authClient.getSession();

        if (session.data?.user) {
          navigate({
            to: "/dashboard",
          });
          return;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }
      navigate({
        to: "/auth/$authView",
        params: {
          authView: "login",
        },
      });
    };

    handleCallback();
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader />
    </div>
  );
}
