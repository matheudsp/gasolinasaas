import { Link, useSearchParams } from "react-router-dom";
import { appUrlFromParam } from "@/lib/appScheme";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Smartphone } from "lucide-react";

/**
 * Página de destino após redefinir a senha com sucesso.
 *
 * A ação principal volta ao app mobile: a tabela `user` do Better Auth é
 * compartilhada com o app (clientes finais), e quem passa por este fluxo
 * é, na maioria dos casos, um usuário do app mobile. O link secundário
 * para /login cobre o outro caso: tenantOwners/admins que iniciaram o
 * "esqueci a senha" pelo próprio painel.
 */
export default function OnPasswordReset() {
  // Scheme vindo do redirectTo do app (o mobile injeta o PRÓPRIO scheme) e
  // repassado pelo /reset-password — reabre o app que iniciou o reset.
  const [searchParams] = useSearchParams();
  const appUrl = appUrlFromParam(searchParams.get("app"));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border shadow-sm">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Senha redefinida!
            </CardTitle>
            <CardDescription className="text-sm">
              Sua senha foi alterada com sucesso.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-start gap-2.5 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>
              Volte para o <strong>app</strong> no seu celular e entre com sua
              nova senha.
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pb-8">
          <Button asChild className="w-full h-11 text-base shadow-sm">
            <a href={appUrl}>Abrir o app</a>
          </Button>
          <p className="text-xs text-muted-foreground text-center px-4">
            Se o app não abrir automaticamente, abra-o manualmente e faça login
            com sua nova senha.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Gestor da rede?{" "}
            <Link
              to="/login"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Acesse o painel
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
