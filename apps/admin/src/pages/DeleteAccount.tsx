import { Link } from "react-router-dom";
import { AlertTriangle, Mail, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Página PÚBLICA de solicitação de exclusão de conta.
 *
 * Exigência do Google Play para apps com cadastro: precisa existir uma URL
 * acessível SEM login explicando como excluir a conta, o que é apagado e o
 * que é mantido. O conteúdo aqui reflete o que o código realmente faz —
 * `tenant.deleteAccount` remove a linha de `user`, e as FKs com
 * onDelete: "cascade" levam junto pontos, resgates, tokens e vínculos.
 */

// Deve espelhar Config.SUPPORT_EMAIL do app mobile.
const SUPPORT_EMAIL = "mdsp.personal@gmail.com";

const APAGADO = [
  "Conta de acesso, sessões e senha",
  "Nome, e-mail e CPF",
  "Saldo de pontos e todo o extrato (créditos, resgates, estornos e expirações)",
  "Pedidos de resgate e códigos gerados",
  "Token de notificações e o histórico de notificações recebidas",
  "Vínculo com as redes de postos em que você participava",
];

export default function DeleteAccount() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Solicitação de exclusão de conta",
  )}&body=${encodeURIComponent(
    "Quero excluir minha conta do aplicativo Gasolina Cloud.\n\nE-mail cadastrado: \nCPF (opcional, ajuda a localizar o cadastro): \n",
  )}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Excluir sua conta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aplicativo <strong>Gasolina Cloud</strong> — como solicitar a
            exclusão da sua conta e dos seus dados.
          </p>
        </header>

        {/* ── Como excluir ────────────────────────────────────────────────── */}
        <h2 className="mt-8 mb-3 text-lg font-semibold tracking-tight">
          Como excluir
        </h2>

        <div className="space-y-3">
          <Card>
            <CardContent className="flex items-start gap-4 py-5">
              <div className="rounded-md bg-primary/5 p-2 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Pelo aplicativo (imediato)</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Abra o app, vá em <strong>Minha Conta</strong> e toque em{" "}
                  <strong>Excluir conta</strong>. A exclusão é confirmada na
                  hora e não pode ser desfeita.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-4 py-5">
              <div className="rounded-md bg-primary/5 p-2 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Por e-mail</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Se você não consegue acessar a conta, escreva para{" "}
                  <a
                    href={mailto}
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  a partir do e-mail cadastrado, informando que deseja excluir
                  sua conta. Respondemos em até <strong>30 dias</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── O que é apagado ─────────────────────────────────────────────── */}
        <h2 className="mt-10 mb-3 text-lg font-semibold tracking-tight">
          O que é apagado
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          A exclusão é permanente e remove, de forma definitiva:
        </p>
        <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {APAGADO.map((item) => (
            <li key={item} className="pl-1">
              {item}
            </li>
          ))}
        </ul>

        {/* ── Aviso sobre pontos ──────────────────────────────────────────── */}
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm leading-relaxed">
            <strong>Seus pontos são perdidos.</strong> O saldo e o histórico do
            programa de fidelidade são apagados junto com a conta e não podem
            ser recuperados nem transferidos. Se quiser usar os pontos, resgate
            antes de excluir.
          </p>
        </div>

        {/* ── O que é mantido ─────────────────────────────────────────────── */}
        <h2 className="mt-10 mb-3 text-lg font-semibold tracking-tight">
          O que é mantido
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Se você atuou como frentista ou responsável por uma rede, os
          lançamentos que você registrou para <strong>outros clientes</strong>{" "}
          permanecem no histórico daquela rede, porque são dados dessas pessoas
          e do posto. Esses registros deixam de ter qualquer ligação com você: a
          identificação do operador é removida e passa a constar em branco.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Registros exigidos por obrigação legal ou fiscal podem ser mantidos
          pelo prazo previsto em lei, sempre sem os seus dados de identificação.
        </p>

        {/* ── Rodapé ──────────────────────────────────────────────────────── */}
        <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
          Mais detalhes sobre o tratamento dos seus dados estão na{" "}
          <Link
            to="/politicas/politica-de-privacidade"
            className="font-medium text-primary underline underline-offset-4"
          >
            Política de Privacidade
          </Link>
          .
        </p>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Gasolina Cloud
        </p>
      </div>
    </div>
  );
}
