import { AuthView } from "@daveyplate/better-auth-ui";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/auth-client";

export const Route = createFileRoute("/(auth)/auth/$authView")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user) {
      redirect({
        to: "/dashboard",
        throw: true,
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  // const { authView } = Route.useParams();

  // const isSignUp = authView === "sign-up";

  // Build full callback URL for OAuth redirects
  // const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  // const callbackUrl = `${appUrl}${localizeHref("/auth/callback")}`;

  return (
    <main className="flex grow flex-col items-center justify-center gap-4 self-center p-4 md:p-6">
      <AuthView
        // callbackURL={callbackUrl}
        localization={{
          SIGN_IN: "Entrar",
          SIGN_IN_DESCRIPTION: "Faça login na sua conta",
          EMAIL: "Email",
          PASSWORD: "Senha",
          FORGOT_PASSWORD_LINK: "Esqueceu a senha?",
          SIGN_IN_ACTION: "Entrar",
          OR_CONTINUE_WITH: "Ou continue com",
          DONT_HAVE_AN_ACCOUNT: "Não tem uma conta?",
          SIGN_UP: "Cadastrar",
          SIGN_UP_DESCRIPTION: "Crie uma nova conta",
          SIGN_UP_ACTION: "Registrar",
          ALREADY_HAVE_AN_ACCOUNT: "Já tem uma conta?",
          SIGN_IN_WITH: "Entrar com",
        }}
      />
    </main>
  );
}
