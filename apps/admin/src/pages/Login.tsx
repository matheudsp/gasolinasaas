import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
import { LockKeyhole } from "lucide-react";
import { Logo } from "@/components/Logo";
import { authErrorMessage, isEmailNotVerified } from "@/lib/authErrors";
import { useToast } from "@/components/ui/use-toast";

export default function Login() {
  const { signIn, session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const role = await signIn(email, password);
      navigate(role === "admin" ? "/admin" : "/dashboard");
    } catch (err: unknown) {
      // E-mail não verificado: o server já REENVIA o link nessa tentativa
      // (sendOnSignIn) — orienta a caixa de entrada em vez de "acesso negado".
      if (isEmailNotVerified(err)) {
        toast({
          title: "Confirme seu e-mail",
          description: authErrorMessage(err),
        });
      } else {
        toast({
          title: "Acesso Negado",
          description: authErrorMessage(err),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border shadow-sm">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7C3AED]/10">
            <Logo className="h-9 w-auto" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              GASOLINA
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Gestão de Rede e Fidelização
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
                className="bg-transparent"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-medium">
                  Senha
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Autenticando..." : "Entrar"}
            </Button>

            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <LockKeyhole className="h-3.5 w-3.5" />
              <span>
                Acesso restrito. Sessões são registradas para auditoria.
              </span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
