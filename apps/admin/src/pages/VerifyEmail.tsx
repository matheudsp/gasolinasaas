import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { appUrlForTenant } from "@/lib/appScheme";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, MailWarning, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Destino de sendVerificationEmail. Diferente do reset de senha, o
 * Better Auth não adiciona ?token= em caso de sucesso — só redireciona
 * limpo para callbackURL. Falha adiciona ?error=invalid_token. Por isso
 * a detecção de sucesso aqui é "ausência do parâmetro de erro", não
 * presença de um token.
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { toast } = useToast();

  const hasError = searchParams.get("error") === "invalid_token";
  // Injetado no callbackURL pelo server (lib/auth.ts) — resolve o scheme do
  // app certo quando a rede tiver app premium/dedicado.
  const appUrl = appUrlForTenant(searchParams.get("tenant"));

  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResending(true);

    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/verify-email`,
    });

    setResending(false);

    if (error) {
      toast({
        title: "Erro ao reenviar",
        description: error.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
      return;
    }

    setResent(true);
  }

  // ── Sucesso: sem token de verificar, já validado pelo servidor ────
  if (!hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border shadow-sm">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                E-mail confirmado!
              </CardTitle>
              <CardDescription className="text-sm">
                Seu endereço de e-mail foi verificado com sucesso.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-start gap-2.5 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>
                Volte para o <strong>app</strong> no seu celular para continuar.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-8">
            <Button asChild className="w-full h-11 text-base shadow-sm">
              <a href={appUrl}>Abrir o app</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Link já reenviado — confirmação simples ───────────────────────
  if (resent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border shadow-sm">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MailWarning className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Novo link enviado
              </CardTitle>
              <CardDescription className="text-sm">
                Verifique sua caixa de entrada em <strong>{email}</strong>.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ── Erro: token inválido/expirado — oferece reenviar ──────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border shadow-sm">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <MailWarning className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Link inválido ou expirado
            </CardTitle>
            <CardDescription className="text-sm">
              Informe seu e-mail para receber um novo link de confirmação.
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleResend}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="bg-transparent"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2 pb-8">
            <Button
              type="submit"
              className="w-full h-11 text-base shadow-sm"
              disabled={resending}
            >
              {resending ? "Enviando..." : "Reenviar confirmação"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
