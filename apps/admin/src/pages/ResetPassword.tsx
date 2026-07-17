import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { KeyRound } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Sem token válido na URL — o Better Auth já redireciona pra cá com
  // ?error=INVALID_TOKEN quando o link expirou, já foi usado, ou nunca
  // foi gerado com um redirectTo correto.
  if (!token || linkError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border shadow-sm">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <KeyRound className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Link inválido ou expirado
              </CardTitle>
              <CardDescription className="text-sm">
                Solicite um novo link de redefinição de senha.
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="pb-8">
            <Button asChild className="w-full h-11">
              <Link to="/forgot-password">Solicitar novo link</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  function validate(): string | null {
    if (newPassword.length < 8)
      return "A senha deve ter pelo menos 8 caracteres";
    if (newPassword !== confirmPassword) return "As senhas não coincidem";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      toast({
        title: "Verifique os campos",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword,
      token: token!,
    });
    setLoading(false);

    if (error) {
      toast({
        title: "Não foi possível redefinir a senha",
        description:
          error.message ?? "O link pode ter expirado. Solicite um novo.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Senha redefinida com sucesso",
      description: "Faça login com sua nova senha.",
    });
    // Repassa o scheme do app (se veio no redirectTo do mobile) — o
    // on-password-reset usa pra reabrir o app que iniciou o reset.
    const app = searchParams.get("app");
    navigate(
      `/on-password-reset${app ? `?app=${encodeURIComponent(app)}` : ""}`,
      { replace: true },
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
              Nova senha
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Escolha uma nova senha para sua conta
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="font-medium">
                Nova senha
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                className="bg-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-medium">
                Confirmar nova senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
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
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
