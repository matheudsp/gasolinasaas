import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Gift,
  LineChart,
  MessageCircle,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";

/**
 * Landing page pública do Gasolina Cloud (rota `/`).
 *
 * Conceito editorial ancorado no universo de POSTO: layout assimétrico,
 * mockup real do app, faixa tipo painel de preço (LED), bento grid e seções
 * escuras alternadas. Paleta explícita (ink/violet/lime/paper), independente
 * do tema neutro do painel — a landing tem identidade própria fora do `.dark`.
 *
 * Acentos: violeta #7C3AED (marca) + lime #D4FF3F ("octanagem", usado com
 * parcimônia) sobre papel quente #FAF9F6 e tinta #0B0A12.
 */

const WHATSAPP_NUMBER = "5589994176493";
const WHATSAPP_DISPLAY = "(89) 9 9417-6493";
const WHATSAPP_MESSAGE = "Olá! Tenho um posto e quero conhecer o Gasolina Cloud.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

// Itens rotativos da faixa LED (painel de preço). Duplicados no JSX p/ loop.
const TICKER_ITEMS = [
  "Pontos a cada real gasto",
  "App white-label com a sua marca",
  "Campanhas de pontos em dobro",
  "Recompensas validadas no caixa",
  "Push que traz o cliente de volta",
  "Painel com números reais",
] as const;

// Padrão fixo do "QR" do mockup (evita Math.random re-render). 1 = módulo cheio.
const QR_PATTERN = [
  [1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 1, 1, 0, 0, 0, 1, 1, 1],
  [0, 0, 0, 1, 0, 1, 0, 0, 0],
  [1, 0, 1, 1, 1, 0, 0, 1, 1],
  [0, 1, 0, 0, 1, 1, 1, 0, 0],
  [1, 1, 1, 0, 0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 1, 0, 1, 1, 0, 1, 1],
] as const;

const GRID_TEXTURE = {
  backgroundImage: "radial-gradient(#0b0a1214 1px, transparent 1px)",
  backgroundSize: "22px 22px",
} as const;

function AppMockup() {
  return (
    <div className="gc-float relative w-[280px] rounded-[2.75rem] border border-white/10 bg-[#0B0A12] p-3 shadow-2xl ring-1 ring-black/5">
      {/* entalhe */}
      <div className="-translate-x-1/2 absolute top-3 left-1/2 h-1.5 w-16 rounded-full bg-white/15" />
      <div className="overflow-hidden rounded-[2.1rem] bg-[#FAF9F6] pt-8 pb-6">
        <div className="px-5">
          <p className="font-semibold text-[11px] text-slate-400 uppercase tracking-widest">
            Grupo Martinez
          </p>

          {/* Cartão de pontos */}
          <div className="mt-3 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-5 text-white">
            <p className="text-[11px] text-violet-200 uppercase tracking-widest">
              Seu saldo
            </p>
            <p className="mt-1 font-bold text-4xl tracking-tight">1.240</p>
            <p className="text-sm text-violet-200">pontos acumulados</p>
            <div className="mt-4 flex items-center gap-2 border-white/15 border-t pt-3">
              <Gift className="h-4 w-4 text-[#D4FF3F]" aria-hidden="true" />
              <span className="text-xs text-violet-100">
                3 recompensas ao seu alcance
              </span>
            </div>
          </div>

          {/* QR */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div
              className="grid flex-shrink-0 gap-[2px] rounded-md bg-white p-1.5"
              style={{ gridTemplateColumns: "repeat(9, 1fr)" }}
            >
              {QR_PATTERN.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: grade estática decorativa
                    key={`${r}-${c}`}
                    className={`h-[7px] w-[7px] rounded-[1px] ${
                      cell ? "bg-slate-900" : "bg-transparent"
                    }`}
                  />
                )),
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Mostrar no caixa</p>
              <p className="text-slate-500 text-xs">Frentista escaneia e credita</p>
            </div>
          </div>

          {/* faixa promo */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#D4FF3F] px-3 py-2">
            <Bell className="h-4 w-4 text-slate-900" aria-hidden="true" />
            <span className="font-semibold text-slate-900 text-xs">
              Hoje: pontos em dobro na gasolina
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  useEffect(() => {
    const previous = document.title;
    document.title =
      "Gasolina Cloud — Programa de fidelidade para postos e redes de combustível";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-screen scroll-smooth bg-[#FAF9F6] text-slate-900 antialiased">
      {/* Nav fixa */}
      <header className="sticky top-0 z-50 border-slate-900/10 border-b bg-[#FAF9F6]/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#topo" className="flex items-center gap-2.5">
            <span className="relative">
              <Logo className="h-8 w-8" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-[#D4FF3F] ring-2 ring-[#FAF9F6]" />
            </span>
            <span className="font-semibold text-lg tracking-tight">
              Gasolina <span className="text-violet-600">Cloud</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {[
              ["Recursos", "#recursos"],
              ["Como funciona", "#como-funciona"],
              ["Planos", "#planos"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="font-medium text-slate-600 text-sm transition-colors hover:text-slate-900"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="inline-flex h-9 items-center rounded-md px-3 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-900/5"
            >
              Entrar
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-violet-600 px-4 font-semibold text-sm text-white shadow-sm transition-colors hover:bg-violet-700"
            >
              Falar com consultor
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </nav>
      </header>

      <main id="topo">
        {/* Hero assimétrico */}
        <section className="relative overflow-hidden">
          <div className="-z-10 absolute inset-0" style={GRID_TEXTURE} aria-hidden="true" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
            {/* Coluna de texto */}
            <div>
              <p className="flex items-center gap-2 font-semibold text-slate-500 text-xs uppercase tracking-[0.2em]">
                <span className="h-2 w-2 rounded-full bg-[#D4FF3F] ring-1 ring-slate-900/10" />
                Fidelidade para postos e redes
              </p>

              <h1 className="mt-5 text-balance font-semibold text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Faça o cliente{" "}
                <span className="relative inline-block">
                  <span
                    className="-skew-x-6 -z-10 absolute inset-x-[-6px] bottom-1.5 h-5 bg-[#D4FF3F]"
                    aria-hidden="true"
                  />
                  voltar
                </span>{" "}
                pra bomba.
              </h1>

              <p className="mt-6 max-w-lg text-pretty text-lg text-slate-600 leading-relaxed">
                O programa de fidelidade white-label da sua rede: app com a sua
                marca, pontos a cada real abastecido e campanhas que trazem o
                motorista de volta — em vez de deixar ele abastecer no
                concorrente.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-7 font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Falar com um consultor
                </a>
                <Link
                  to="/login"
                  className="group inline-flex h-12 items-center justify-center gap-1.5 rounded-lg px-4 font-semibold text-slate-800 transition-colors hover:text-violet-700"
                >
                  Já sou cliente
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>

              <p className="mt-6 text-slate-500 text-sm">
                Direto no WhatsApp:{" "}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-900 underline decoration-[#D4FF3F] decoration-2 underline-offset-4 hover:text-violet-700"
                >
                  {WHATSAPP_DISPLAY}
                </a>
              </p>
            </div>

            {/* Coluna do mockup sobre painel violeta */}
            <div className="relative flex justify-center lg:justify-end">
              <div
                className="-z-10 absolute inset-0 m-auto h-72 w-72 rounded-full bg-violet-600/15 blur-3xl"
                aria-hidden="true"
              />
              <AppMockup />
            </div>
          </div>
        </section>

        {/* Faixa LED (painel de preço) */}
        <section
          aria-hidden="true"
          className="overflow-hidden border-slate-900/10 border-y bg-[#0B0A12] py-4"
        >
          <div className="gc-marquee flex w-max items-center gap-8 whitespace-nowrap">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: faixa decorativa com itens duplicados
              <span key={i} className="flex items-center gap-8">
                <span className="font-semibold text-lg text-white/90 tracking-tight">
                  {item}
                </span>
                <span className="text-[#D4FF3F] text-xl">✦</span>
              </span>
            ))}
          </div>
        </section>

        {/* Recursos — bento grid */}
        <section id="recursos" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <h2 className="max-w-xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
                Uma plataforma inteira,
                <br />
                do caixa ao painel.
              </h2>
              <p className="max-w-xs text-slate-600">
                Nada de gambiarra com cartãozinho de papel. Tudo digital, sem
                fraude e com a sua marca.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
              {/* Card grande */}
              <article className="group relative overflow-hidden rounded-3xl border border-slate-900/10 bg-[#0B0A12] p-8 text-white md:col-span-4">
                <div className="relative z-10 max-w-md">
                  <span className="font-mono text-[#D4FF3F] text-sm">01</span>
                  <h3 className="mt-3 font-semibold text-3xl tracking-tight">
                    O seu posto no bolso do cliente
                  </h3>
                  <p className="mt-3 text-slate-300 leading-relaxed">
                    App white-label com o seu nome, logo e cores — publicado nas
                    lojas sem você tocar em uma linha de código. O cliente vê a
                    marca da sua rede, não a nossa.
                  </p>
                </div>
                <div
                  className="absolute right-[-40px] bottom-[-40px] h-56 w-56 rounded-full bg-violet-600/40 blur-2xl"
                  aria-hidden="true"
                />
              </article>

              {/* Card médio */}
              <article className="rounded-3xl border border-slate-900/10 bg-white p-8 md:col-span-2">
                <ShieldCheck className="h-8 w-8 text-violet-600" aria-hidden="true" />
                <span className="mt-4 block font-mono text-slate-400 text-sm">02</span>
                <h3 className="mt-1 font-semibold text-xl tracking-tight">
                  Pontos sem fraude
                </h3>
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                  Crédito e resgate validados pelo frentista no caixa. A âncora
                  de confiança é o seu operador.
                </p>
              </article>

              {/* Card médio */}
              <article className="rounded-3xl border border-slate-900/10 bg-white p-8 md:col-span-2">
                <Bell className="h-8 w-8 text-violet-600" aria-hidden="true" />
                <span className="mt-4 block font-mono text-slate-400 text-sm">03</span>
                <h3 className="mt-1 font-semibold text-xl tracking-tight">
                  Campanhas e push
                </h3>
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                  Pontos em dobro e promoções que você dispara direto pra quem já
                  abastece com você.
                </p>
              </article>

              {/* Card largo com mini-gráfico */}
              <article className="flex flex-col justify-between gap-6 rounded-3xl border border-slate-900/10 bg-white p-8 md:col-span-4 md:flex-row md:items-end">
                <div className="max-w-sm">
                  <LineChart className="h-8 w-8 text-violet-600" aria-hidden="true" />
                  <span className="mt-4 block font-mono text-slate-400 text-sm">04</span>
                  <h3 className="mt-1 font-semibold text-2xl tracking-tight">
                    Painel com números reais
                  </h3>
                  <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                    Passivo de pontos, taxa de resgate, ranking de clientes e de
                    operadores. Você decide com dado, não no achismo.
                  </p>
                </div>
                {/* mini barras decorativas */}
                <div
                  className="flex h-24 items-end gap-2"
                  aria-hidden="true"
                >
                  {[40, 62, 48, 78, 58, 92].map((h) => (
                    <div
                      key={h}
                      className="w-5 rounded-t-md bg-violet-600/85"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Como funciona — seção escura */}
        <section id="como-funciona" className="scroll-mt-20 bg-[#0B0A12] text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              Dois toques no caixa.
              <br />
              <span className="text-slate-400">O resto é fidelidade.</span>
            </h2>

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {[
                {
                  icon: QrCode,
                  title: "Cliente mostra o QR",
                  desc: "No app, o cliente abre o código de identidade e apresenta na hora de pagar.",
                },
                {
                  icon: ShieldCheck,
                  title: "Frentista credita",
                  desc: "O operador escaneia e digita o valor abastecido. Os pontos entram na conta na hora.",
                },
                {
                  icon: Gift,
                  title: "Cliente resgata e volta",
                  desc: "Recompensas validadas na entrega. Motivo de sobra pra voltar sempre ao seu posto.",
                },
              ].map((step, index) => (
                <div key={step.title} className="relative border-white/10 border-t pt-6">
                  <span className="font-mono text-[#D4FF3F] text-sm">
                    0{index + 1}
                  </span>
                  <step.icon className="mt-4 h-9 w-9 text-white" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-xl tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Planos — só por consulta, motivo "totem/placa" */}
        <section id="planos" className="scroll-mt-20">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
            <div className="grid items-center gap-10 rounded-3xl border border-slate-900/10 bg-white p-8 sm:p-12 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold text-slate-500 text-xs uppercase tracking-[0.2em]">
                  Planos
                </p>
                <h2 className="mt-3 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
                  Sob medida para a sua rede.
                </h2>
                <p className="mt-4 max-w-lg text-slate-600 leading-relaxed">
                  Nada de tabela genérica. Um consultor monta o plano ideal para
                  o número de postos e o volume de clientes que você tem —
                  inclusive app dedicado com a marca da sua rede.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-7 font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
                  >
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    Solicitar proposta
                  </a>
                  <span className="text-slate-500 text-sm">
                    ou {WHATSAPP_DISPLAY}
                  </span>
                </div>
              </div>

              {/* Placa de posto "SOB CONSULTA" */}
              <div className="mx-auto w-52 rounded-2xl bg-[#0B0A12] p-2 shadow-xl">
                <div className="rounded-xl border border-white/10 p-5 text-center">
                  <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                    Gasolina Cloud
                  </p>
                  <p className="mt-4 font-semibold text-4xl text-[#D4FF3F] leading-none tracking-tight">
                    SOB
                  </p>
                  <p className="font-semibold text-4xl text-[#D4FF3F] leading-none tracking-tight">
                    CONSULTA
                  </p>
                  <div className="mt-5 border-white/10 border-t pt-3">
                    <p className="text-[11px] text-slate-400">
                      por rede · sem surpresa
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-violet-600 text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center">
            <h2 className="max-w-xl text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
              Pronto para não perder mais cliente pra concorrência?
            </h2>
            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#D4FF3F] px-7 font-semibold text-slate-900 transition-transform hover:scale-[1.02]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Falar com um consultor
              </a>
              <Link
                to="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/30 px-7 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Acessar o sistema
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="bg-[#0B0A12] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                <Logo className="h-7 w-7" />
                <span className="font-semibold tracking-tight">
                  Gasolina <span className="text-violet-400">Cloud</span>
                </span>
              </div>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Plataforma de fidelidade white-label para postos e redes de
                combustível.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:gap-20">
              <div>
                <h3 className="font-semibold text-sm text-white">Plataforma</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a href="#recursos" className="text-slate-400 hover:text-white">
                      Recursos
                    </a>
                  </li>
                  <li>
                    <a href="#planos" className="text-slate-400 hover:text-white">
                      Planos
                    </a>
                  </li>
                  <li>
                    <Link to="/login" className="text-slate-400 hover:text-white">
                      Entrar
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">Contato & Legal</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white"
                    >
                      WhatsApp: {WHATSAPP_DISPLAY}
                    </a>
                  </li>
                  <li>
                    <Link to="/politicas" className="text-slate-400 hover:text-white">
                      Termos e políticas
                    </Link>
                  </li>
                  <li>
                    <Link to="/excluir-conta" className="text-slate-400 hover:text-white">
                      Excluir conta
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 border-white/10 border-t pt-6 text-slate-500 text-sm">
            © {new Date().getFullYear()} Gasolina Cloud. Todos os direitos
            reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
