import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { orpc } from "@/lib/orpc";

// A quantos dias do vencimento começa o lembrete "amigável" (dispensável).
const WARN_DAYS = 5;

function daysUntil(end: Date, now: Date) {
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

/**
 * Aviso de cobrança para o owner: lembra do vencimento próximo (dispensável)
 * e alerta de assinatura vencida/suspensa/cancelada (persistente). Não aparece
 * para o admin da plataforma. O dispensar é por período — reaparece na próxima
 * renovação ou mudança de status.
 */
export function PaymentReminderBanner() {
  const { isAdmin, activeTenant } = useAuth();
  const enabled = !isAdmin && !!activeTenant;

  const { data: sub } = useQuery({
    ...orpc.subscription.getMine.queryOptions(),
    enabled,
  });

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  if (!(enabled && sub)) return null;

  const now = new Date();
  const end = new Date(sub.currentPeriodEnd);
  const daysLeft = daysUntil(end, now);
  const isTrial = sub.status === "trial";

  let severity: "warning" | "danger" | null = null;
  let message = "";

  if (sub.status === "suspended") {
    severity = "danger";
    message =
      "Sua assinatura está suspensa. Regularize o pagamento para reativar o acesso.";
  } else if (sub.status === "cancelled") {
    severity = "danger";
    message =
      "Sua assinatura foi cancelada. Fale com o suporte para reativar o acesso.";
  } else if (sub.status === "active" || sub.status === "trial") {
    if (daysLeft < 0) {
      severity = "danger";
      const atraso =
        daysLeft === -1 ? "ontem" : `há ${Math.abs(daysLeft)} dias`;
      message = isTrial
        ? "Seu período de teste terminou. Assine para continuar usando o acesso."
        : `Sua assinatura venceu ${atraso}. Regularize o pagamento para continuar.`;
    } else if (daysLeft <= WARN_DAYS) {
      severity = "warning";
      const quando =
        daysLeft === 0
          ? "hoje"
          : daysLeft === 1
            ? "amanhã"
            : `em ${daysLeft} dias`;
      message = isTrial
        ? `Seu período de teste termina ${quando}. Assine para não perder o acesso.`
        : `Sua assinatura vence ${quando}. Pague para continuar usando o acesso.`;
    }
  }

  if (!severity) return null;

  // Só o lembrete de vencimento próximo é dispensável; os críticos ficam.
  const dismissible = severity === "warning";
  const key = `gasolina.payReminder.${activeTenant.id}.${sub.status}.${end.toISOString()}`;

  if (
    dismissible &&
    (dismissedKey === key || localStorage.getItem(key) === "1")
  ) {
    return null;
  }

  const tone =
    severity === "danger"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";

  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${tone}`}
      role="alert"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <Link
        to="/minha-assinatura"
        className="whitespace-nowrap font-medium underline underline-offset-2"
      >
        Ver assinatura
      </Link>
      {dismissible && (
        <button
          type="button"
          aria-label="Dispensar aviso"
          className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
          onClick={() => {
            localStorage.setItem(key, "1");
            setDismissedKey(key);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
