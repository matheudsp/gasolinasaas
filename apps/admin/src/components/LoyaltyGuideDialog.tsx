import { useState } from "react";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  Gift,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Guia de configuração do programa de pontos para o dono da rede.
 *
 * O medo real do cliente é "perder dinheiro em cada venda" — por isso o guia
 * é ancorado num SIMULADOR que mostra o investimento por venda em R$ e em %
 * do faturamento, usando o multiplicador que ele já configurou.
 */

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const NUM = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

/** Meta de custo do programa: 0,8% do faturamento (folgado pra margem de combustível). */
const META_CUSTO = 0.008;

/** Recompensas típicas de posto — o custo é o que VOCÊ paga, não o preço de venda. */
const RECOMPENSAS = [
  { nome: "Café ou água", custo: 3 },
  { nome: "Salgado + bebida", custo: 12 },
  { nome: "Aditivo para combustível", custo: 20 },
  { nome: "Copo térmico (linha Stanley)", custo: 20 },
  { nome: "Lavagem simples", custo: 25 },
  { nome: "R$ 30 em combustível", custo: 30 },
  { nome: "Troca de óleo", custo: 80 },
];

export function LoyaltyGuideDialog({ pointsPerReal }: { pointsPerReal: number }) {
  const [open, setOpen] = useState(false);

  // Simulador
  const [ticket, setTicket] = useState("150");
  const [custoRecompensa, setCustoRecompensa] = useState("12");
  const [pontosRecompensa, setPontosRecompensa] = useState("15000");

  // Usa o multiplicador que ele já configurou (fallback 1 pra não dividir por 0).
  const ppr = pointsPerReal > 0 ? pointsPerReal : 1;

  const ticketN = Number(ticket.replace(",", ".")) || 0;
  const custoN = Number(custoRecompensa.replace(",", ".")) || 0;
  const pontosN = Number(pontosRecompensa.replace(/\D/g, "")) || 0;

  const reaisParaGanhar = pontosN / ppr;
  const abastecimentos = ticketN > 0 ? reaisParaGanhar / ticketN : 0;
  const custoPct = reaisParaGanhar > 0 ? (custoN / reaisParaGanhar) * 100 : 0;
  const investimentoPorVenda = ticketN * (custoPct / 100);

  const veredito =
    custoPct === 0
      ? null
      : custoPct <= 1
        ? { label: "Saudável", tone: "text-emerald-600 dark:text-emerald-400" }
        : custoPct <= 2
          ? { label: "Atenção", tone: "text-amber-600 dark:text-amber-400" }
          : { label: "Caro demais", tone: "text-destructive" };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Guia
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Como configurar seu programa de pontos</DialogTitle>
          <DialogDescription>
            Quanto dar, por quanto tempo valem e quanto isso custa de verdade.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
          {/* ── 1. O medo: "vou perder dinheiro?" ─────────────────────────── */}
          <section className="rounded-lg border border-emerald-600/20 bg-emerald-600/5 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Você não perde a cada venda
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A recompensa só sai <strong>depois</strong> que o cliente já
              abasteceu muitas vezes com você. Bem configurado, o programa custa{" "}
              <strong>menos de 1% do faturamento</strong> — algo como{" "}
              <strong>R$ 1,20 numa venda de R$ 150</strong>. Não é desconto na
              margem: é o preço de fazer o cliente voltar em vez de abastecer no
              concorrente.
            </p>
          </section>

          {/* ── 2. Pontos por real ────────────────────────────────────────── */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Pontos por real: número grande motiva mais
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Este campo <strong>não muda quanto o programa custa</strong> — ele
              muda o quanto o cliente <em>sente</em> que está ganhando. É o que
              AliExpress, Shopee e companhias aéreas fazem: ninguém se anima com
              “você ganhou 150 pontos”, mas “você ganhou{" "}
              <strong>1.500 pontos</strong>” parece uma conquista.
            </p>
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">Mesma economia, sensações diferentes:</p>
              <ul className="mt-1.5 space-y-1 text-muted-foreground">
                <li>
                  1 ponto/real → abastecer R$ 150 dá <strong>150 pontos</strong>;
                  recompensa custa 1.500 pontos.
                </li>
                <li>
                  10 pontos/real → o mesmo R$ 150 dá{" "}
                  <strong>1.500 pontos</strong>; a mesma recompensa custa 15.000
                  pontos.
                </li>
              </ul>
              <p className="mt-2 text-xs">
                O cliente gasta exatamente o mesmo nos dois casos. O que muda é a
                percepção — e ela é de graça.
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Sugestão: <strong>10 pontos por real</strong>.
              </span>
            </p>
          </section>

          {/* ── 3. Validade ───────────────────────────────────────────────── */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              Validade dos pontos
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Validade serve para duas coisas: <strong>criar urgência</strong>{" "}
              (“preciso usar antes de perder” traz o cliente de volta) e{" "}
              <strong>limitar sua dívida</strong> — pontos sem prazo se acumulam
              para sempre e viram um passivo que você não controla.
            </p>
            <p className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Sugestão: <strong>365 dias</strong>. Prazo curto (60–90 dias)
                frustra quem abastece pouco e queima a confiança no programa.
              </span>
            </p>
          </section>

          {/* ── 4. Simulador ──────────────────────────────────────────────── */}
          <section className="space-y-3 rounded-lg border p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Calculator className="h-4 w-4 text-primary" />
              Quanto vai custar? (simulador)
            </h3>
            <p className="text-xs text-muted-foreground">
              Usa o seu multiplicador atual: <strong>{ppr}</strong> ponto(s) por
              real.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sim-ticket" className="text-xs">
                  Ticket médio (R$)
                </Label>
                <Input
                  id="sim-ticket"
                  inputMode="decimal"
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sim-custo" className="text-xs">
                  Custo da recompensa (R$)
                </Label>
                <Input
                  id="sim-custo"
                  inputMode="decimal"
                  value={custoRecompensa}
                  onChange={(e) => setCustoRecompensa(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sim-pontos" className="text-xs">
                  Preço em pontos
                </Label>
                <Input
                  id="sim-pontos"
                  inputMode="numeric"
                  value={pontosRecompensa}
                  onChange={(e) => setPontosRecompensa(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Investimento por venda
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {BRL(investimentoPorVenda)}
                </p>
                <p className="text-xs text-muted-foreground">
                  numa venda de {BRL(ticketN)}
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Custo do programa
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {custoPct.toLocaleString("pt-BR", {
                    maximumFractionDigits: 2,
                  })}
                  %
                  {veredito && (
                    <span className={`ml-2 text-sm font-medium ${veredito.tone}`}>
                      {veredito.label}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">do faturamento</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              O cliente precisa gastar <strong>{BRL(reaisParaGanhar)}</strong> —
              cerca de <strong>{NUM(Math.ceil(abastecimentos))} abastecimentos</strong>{" "}
              — para ganhar essa recompensa. Ou seja: você entrega{" "}
              {BRL(custoN)} depois de faturar {BRL(reaisParaGanhar)} com ele.
            </p>
            <p className="text-xs text-muted-foreground">
              Mire em <strong>até 1%</strong>. Acima de 2%, a margem do
              combustível não sustenta.
            </p>
          </section>

          {/* ── 5. Tabela de recompensas ──────────────────────────────────── */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Gift className="h-4 w-4 text-primary" />
              Quanto cobrar por cada recompensa
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Parta do <strong>seu custo</strong> e mire em 0,8% do faturamento.
              A conta é: custo ÷ 0,008 = quanto o cliente precisa gastar; depois
              multiplique pelo seu multiplicador ({ppr} ponto/real).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Recompensa</th>
                    <th className="pb-2 font-medium">Seu custo</th>
                    <th className="pb-2 font-medium">Cliente gasta</th>
                    <th className="pb-2 text-right font-medium">Preço sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {RECOMPENSAS.map((r) => {
                    const gasta = r.custo / META_CUSTO;
                    const pontos = Math.round((gasta * ppr) / 500) * 500;
                    return (
                      <tr key={r.nome} className="border-b last:border-0">
                        <td className="py-2">{r.nome}</td>
                        <td className="py-2 text-muted-foreground">
                          {BRL(r.custo)}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {BRL(gasta)}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {NUM(pontos)} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>
                Tenha ao menos uma recompensa <strong>barata e rápida</strong>{" "}
                (o café): ela prova que o programa funciona e engata o hábito.
                As caras seguram o cliente no longo prazo.
              </p>
              <p>
                Prefira itens de{" "}
                <strong>valor percebido alto e custo baixo</strong> — um copo
                térmico ou um aditivo custam ~R$ 20 para você, mas o cliente vê
                um brinde “de loja”. Vale muito mais como recompensa do que R$
                20 de desconto, que ele esquece no dia seguinte.
              </p>
            </div>
          </section>

          {/* ── 6. Resumo ─────────────────────────────────────────────────── */}
          <section className="rounded-lg border bg-muted/30 p-4">
            <h3 className="font-semibold">Configuração sugerida para começar</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                • Pontos por real: <strong>10</strong>
              </li>
              <li>
                • Validade: <strong>365 dias</strong>
              </li>
              <li>
                • Valor máximo por crédito: <strong>R$ 500</strong> (trava erro
                de digitação do frentista)
              </li>
              <li>
                • Recompensas entre <strong>4.000</strong> e{" "}
                <strong>100.000</strong> pontos, seguindo a tabela acima
              </li>
            </ul>
          </section>
        </div>

        <Button onClick={() => setOpen(false)} className="w-full">
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
}
