import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageIcon, Palette, Save, Upload } from "lucide-react";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Caminhos vêm relativos do server; URLs externas já são absolutas. */
function resolveImageUrl(url: string | null) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`;
}

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Vazio = sem cor personalizada (app usa o tema padrão do build). */
function isColorValid(value: string) {
  return value === "" || HEX_RE.test(value);
}

async function uploadLogo(tenantId: string, image: File) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/tenants/${tenantId}/logo`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": image.type },
      body: image,
    },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Falha no upload do logo");
  }
  return (await res.json()) as { logoUrl: string };
}

// ── Campo de cor (swatch + hex) ────────────────────────────────────────────────

function ColorField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Seletor de ${label.toLowerCase()}`}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
          value={HEX_RE.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <Input
          id={id}
          placeholder="Padrão do app"
          className="w-36 font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          disabled={disabled}
          aria-invalid={!isColorValid(value)}
        />
        {value !== "" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            disabled={disabled}
          >
            Limpar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AppBranding() {
  const qc = useQueryClient();
  const { activeTenant } = useAuth();
  const enabled = !!activeTenant;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [primary, setPrimary] = useState("");

  const { data: branding, isLoading } = useQuery(
    orpc.tenant.branding.queryOptions({ enabled }),
  );

  useEffect(() => {
    if (branding) {
      setPrimary(branding.colors.primary ?? "");
    }
  }, [branding]);

  const invalidateBranding = () =>
    qc.invalidateQueries(orpc.tenant.branding.queryOptions());

  const upload = useMutation({
    mutationFn: (image: File) => uploadLogo(activeTenant?.id ?? "", image),
    onSuccess: () => {
      toast.success("Logo atualizado. O app carrega o novo logo na próxima abertura.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      invalidateBranding();
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const updateColors = useMutation({
    ...orpc.tenant.updateSettings.mutationOptions(),
    onSuccess: () => {
      toast.success("Cores salvas.");
      invalidateBranding();
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const colorsValid = isColorValid(primary);
  const colorsDirty = branding
    ? primary !== (branding.colors.primary ?? "")
    : false;

  const handleSaveColors = () => {
    if (!colorsValid) {
      toast.warning("Use cores em hexadecimal, ex.: #7C3AED.");
      return;
    }
    updateColors.mutate({
      brandPrimaryColor: primary || null,
    });
  };

  const logoSrc = resolveImageUrl(branding?.logoUrl ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marca do app</h1>
        <p className="text-sm text-muted-foreground">
          Logo e cores que o aplicativo dos seus clientes exibe. As mudanças
          valem para todos sem precisar de atualização na loja.
        </p>
      </div>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            Logo do app
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {isLoading ? (
                <Spinner className="size-5" />
              ) : logoSrc ? (
                <img
                  src={logoSrc}
                  alt="Logo atual do app"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="px-2 text-center text-xs text-muted-foreground">
                  Logo padrão do app
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo-file">Novo logo</Label>
              <Input
                id="logo-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={upload.isPending || !enabled}
              />
              <p className="text-xs text-muted-foreground">
                PNG com fundo transparente, quadrado, até 2 MB. Substitui o
                logo nas telas de boas-vindas, login e Sobre.
              </p>
            </div>
          </div>

          <Button
            onClick={() => file && upload.mutate(file)}
            disabled={upload.isPending || !file || !enabled}
            className="gap-2"
          >
            {upload.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Enviar logo
          </Button>
        </CardContent>
      </Card>

      {/* ── Cor principal ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Cor do tema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ColorField
            id="brand-primary"
            label="Cor principal"
            hint="Botões e destaques do app (vale nos temas claro e escuro). Os fundos são padronizados pelos temas claro/escuro e não mudam. Deixe vazio para usar a cor padrão."
            value={primary}
            onChange={setPrimary}
            disabled={updateColors.isPending || !enabled}
          />

          <Button
            onClick={handleSaveColors}
            disabled={updateColors.isPending || !colorsValid || !colorsDirty}
            className="gap-2"
          >
            {updateColors.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
