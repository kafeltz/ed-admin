import { NavLink } from "react-router-dom";
import { LayoutDashboard, MapPin, Building2, ClipboardList, Settings, Shield } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ceps", label: "Cadastrar CEP", icon: MapPin },
  { to: "/imoveis", label: "Imoveis", icon: Building2 },
  { to: "/avaliacoes", label: "Avaliacoes", icon: ClipboardList },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex h-14 items-center gap-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          <span className="font-semibold text-foreground">Admin EasyDoor</span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
