import { useState } from "react";
import { Link } from "react-router-dom";
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
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Não foi possível enviar o link",
        description: error.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
      return;
    }

    // Mensagem neutra de propósito: não confirmamos se o e-mail existe na
    // base, para não permitir enumeração de contas.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border shadow-sm">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Verifique seu e-mail
              </CardTitle>
              <CardDescription className="text-sm">
                Se <strong>{email}</strong> estiver cadastrado, você receberá um
                link para redefinir sua senha. O link expira em 1 hora.
              </CardDescription>
            </div>
          </CardHeader>

          <CardFooter className="flex flex-col gap-3 pb-8">
            <Button asChild variant="outline" className="w-full h-11">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o login
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground text-center px-4">
              Não recebeu? Confira a caixa de spam ou{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="underline underline-offset-2 hover:text-foreground"
              >
                tente novamente
              </button>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border shadow-sm">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Esqueceu a senha?
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Informe seu e-mail e enviaremos um link de redefinição
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="gerente@rededepostos.com.br"
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
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </Button>

            <Link
              to="/login"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para o login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
