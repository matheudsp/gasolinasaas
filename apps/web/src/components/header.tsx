import { Link } from "@tanstack/react-router";

import { ThemeSwitch } from "./theme-switch";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [{ to: "/", label: "Home" }] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* theme switch */}
          <ThemeSwitch />
          {/* user menu */}
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
