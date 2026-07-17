import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck, Star } from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { POLICIES, POLICY_SLUGS, isPolicySlug } from "@/lib/policies";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Páginas PÚBLICAS (sem sessão) dos textos legais — mesmas fontes .md do app
 * mobile. Além de servirem ao usuário, as URLs são o endereço público da
 * Política de Privacidade exigido pelas lojas na submissão do app.
 */

const POLICY_ICONS: Record<string, React.ComponentType<{ className?: string }>> =
  {
    "termos-de-uso": FileText,
    regulamento: Star,
    "politica-de-privacidade": ShieldCheck,
  };

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">{children}</div>
    </div>
  );
}

function Footer() {
  return (
    <p className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
      Gasolina Cloud
    </p>
  );
}

/** Índice: /politicas */
export default function Policies() {
  return (
    <PageShell>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Termos e políticas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentos que regem o uso do aplicativo e o tratamento dos seus dados.
        </p>
      </header>

      <div className="space-y-3">
        {POLICY_SLUGS.map((slug) => {
          const policy = POLICIES[slug];
          const Icon = POLICY_ICONS[slug] ?? FileText;
          return (
            <Link key={slug} to={`/politicas/${slug}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="rounded-md bg-primary/5 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{policy.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {policy.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Footer />
    </PageShell>
  );
}

/** Detalhe: /politicas/:slug */
export function PolicyDetail() {
  const { slug } = useParams();

  if (!isPolicySlug(slug)) {
    return <Navigate to="/politicas" replace />;
  }

  return (
    <PageShell>
      <Link
        to="/politicas"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Termos e políticas
      </Link>

      <article>
        <MarkdownContent>{POLICIES[slug].content}</MarkdownContent>
      </article>

      <Footer />
    </PageShell>
  );
}
