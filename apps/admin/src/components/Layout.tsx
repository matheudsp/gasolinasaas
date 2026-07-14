import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { orpc } from "@/lib/orpc";
import {
  LayoutDashboard,
  Bell,
  CreditCard,
  LogOut,
  User,
  Menu,
  X,
  TowerControl,
  Building2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PaymentReminderBanner } from "@/components/PaymentReminderBanner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const NO_TENANT = "__none__";

/**
 * Seletor de rede do admin da plataforma: escolhe em qual tenant as
 * páginas de gestão (Painel, Notificações) vão operar. Owners não veem
 * isso — o tenant deles é fixo.
 */
function TenantSwitcher() {
  const { activeTenant, selectTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: tenants = [] } = useQuery(
    orpc.admin.tenant.list.queryOptions({ input: {} }),
  );

  return (
    <Select
      value={activeTenant?.id ?? NO_TENANT}
      onValueChange={(value) => {
        if (value === NO_TENANT) {
          selectTenant(null);
          navigate("/admin");
          return;
        }
        const tenant = tenants.find((t) => t.id === value);
        if (!tenant) return;
        selectTenant({ id: tenant.id, name: tenant.name });
        // Se estava no /admin, entra direto no painel da rede escolhida.
        if (location.pathname === "/admin") navigate("/dashboard");
      }}
    >
      <SelectTrigger className="h-8 w-44 gap-1.5">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Escolher rede" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_TENANT}>
          <span className="text-muted-foreground">Nenhuma rede</span>
        </SelectItem>
        {tenants.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Layout() {
  const { user, signOut, isAdmin, activeTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Páginas de gestão de rede só aparecem com um tenant ativo — sempre
  // verdadeiro para owners, e para admins depois de escolher uma rede.
  const navItems = [
    ...(activeTenant
      ? [
          { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
          { to: "/push-notifications", label: "Notificações", icon: Bell },
          { to: "/fidelidade", label: "Fidelidade", icon: Star },
        ]
      : []),
    // Owner acompanha a própria assinatura; admin gerencia todas em
    // /admin → aba Assinaturas.
    ...(!isAdmin && activeTenant
      ? [
          {
            to: "/minha-assinatura",
            label: "Minha Assinatura",
            icon: CreditCard,
          },
        ]
      : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: TowerControl }] : []),
  ];

  const home = isAdmin && !activeTenant ? "/admin" : "/dashboard";

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to={home}
            className="flex items-center gap-2 font-bold tracking-tight text-lg transition-opacity hover:opacity-90"
          >
            <Logo className="h-7 w-auto" />
            <span className="hidden sm:inline">
              Gasolina - Painel Administrativo
            </span>
          </Link>
          {!isAdmin && activeTenant && (
            <span className="hidden rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground lg:inline">
              {activeTenant.name}
            </span>
          )}
        </div>

        <nav className="flex items-center gap-2">
          {isAdmin && (
            <div className="hidden md:block">
              <TenantSwitcher />
            </div>
          )}

          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Button
                  key={item.to}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={
                    isActive ? "font-semibold" : "text-muted-foreground"
                  }
                  asChild
                >
                  <Link to={item.to}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="hidden h-5 w-px bg-border md:block mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 border-border bg-popover text-popover-foreground"
            >
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground truncate">
                {user?.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" /> Minha Conta
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </nav>
      </header>

      {mobileOpen && (
        <div className="border-b border-border bg-card text-card-foreground md:hidden transition-all">
          <nav className="flex flex-col p-3 gap-1">
            {isAdmin && (
              <div className="px-1 pb-2">
                <TenantSwitcher />
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Button
                  key={item.to}
                  variant={isActive ? "default" : "ghost"}
                  className={`justify-start h-10 ${isActive ? "font-semibold" : "text-muted-foreground"}`}
                  asChild
                  onClick={() => setMobileOpen(false)}
                >
                  <Link to={item.to}>
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      )}

      <main className="flex-1">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <PaymentReminderBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
