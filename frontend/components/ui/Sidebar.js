"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useAssistant } from "../../context/AssistantContext";
import { useState, useEffect } from "react";

const navItems = [
  { label: "Overview", icon: "dashboard", href: "/dashboard" },
  { label: "Analytics", icon: "monitoring", href: "/analytics" },
  { label: "Bots", icon: "smart_toy", href: "/bots" },
  { label: "Support", icon: "confirmation_number", href: "/support" },
  { label: "Settings", icon: "settings", href: "/settings" },
];

export default function Sidebar({ activeLabel, isCollapsed, onToggle }) {
  const pathname = usePathname();
  const router = useRouter();
  const { vendor, logout } = useAuth();
  const { open: openAssistant } = useAssistant();

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await logout();
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("botimi_token");
      }
    }
    router.push("/login");
  };

  const allNavItems = vendor?.isSuperadmin
    ? [...navItems, { label: "Admin", icon: "admin_panel_settings", href: "/admin" }]
    : navItems;

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("botimi-theme", next ? "dark" : "light");
    } catch (e) {}
  };

  return (
    <aside className={`fixed left-0 top-0 h-full ${isCollapsed ? 'w-[80px] p-2' : 'w-[260px] p-stack-md'} bg-surface-container border-r border-outline-variant flex flex-col z-50 max-lg:hidden transition-all duration-300 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}>
      <div className={`mb-stack-xl flex items-center ${isCollapsed ? 'flex-col gap-4 mt-4' : 'justify-between px-2'}`}>
        {!isCollapsed ? (
          <Link href="/" target="_top" className="block overflow-hidden">
            <h1 className="font-display text-headline-md font-bold text-primary whitespace-nowrap">botimi Pro</h1>
            <p className="font-label-md text-label-md text-on-surface-variant opacity-70 whitespace-nowrap">Enterprise Tier</p>
          </Link>
        ) : (
          <Link href="/" target="_top" className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary">hub</span>
          </Link>
        )}
        {onToggle && (
          <button 
            onClick={onToggle}
            className={`p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors flex items-center justify-center`}
          >
            <span className="material-symbols-outlined text-[20px]">{isCollapsed ? "menu_open" : "menu_open"}</span>
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1">
        {allNavItems.map((item) => {
          const isActive = pathname === item.href || activeLabel === item.label;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 text-primary font-bold active:scale-[0.98]"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 space-y-4">
        <button
          title={isCollapsed ? "Deploy New Bot" : undefined}
          className={`w-full ${isCollapsed ? 'p-3' : 'py-3'} bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 ai-glow flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all`}
          onClick={() => window.location.href = "/onboarding"}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">add</span>
          {!isCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">Deploy New Bot</span>}
        </button>
        <button
          onClick={toggleTheme}
          title={isCollapsed ? (isDark ? "Light mode" : "Dark mode") : undefined}
          className={`w-full ${isCollapsed ? 'p-3 justify-center' : 'py-3 gap-3 px-3'} flex items-center text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-200`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">
            {isDark ? "light_mode" : "dark_mode"}
          </span>
          {!isCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>
        <div className="pt-4 border-t border-outline-variant space-y-1">
          <Link href="/" title={isCollapsed ? "Home" : undefined} className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-200`}>
            <span className="material-symbols-outlined shrink-0">home</span>
            {!isCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">Home</span>}
          </Link>
          <button type="button" onClick={openAssistant} title={isCollapsed ? "Help" : undefined} className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-200`}>
            <span className="material-symbols-outlined shrink-0">help</span>
            {!isCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">Help</span>}
          </button>
          <a href="#" title={isCollapsed ? "Sign Out" : undefined} onClick={handleSignOut} className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'} text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-200`}>
            <span className="material-symbols-outlined shrink-0">logout</span>
            {!isCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">Sign Out</span>}
          </a>
        </div>
      </div>
    </aside>
  );
}