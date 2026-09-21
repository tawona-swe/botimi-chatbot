"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getContrastColor } from "../../lib/color";

const PLAN_LABELS = {
  trial: "Trial",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export default function ProfileDropdown({ vendor, logout, align = "right", variant = "compact", collapsed = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (!vendor) return null;

  const displayName = vendor.name || vendor.company_name || vendor.email || "Account";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const accentColor = vendor.brand_color || "#4A1A8A";
  const planLabel = PLAN_LABELS[vendor.subscription_plan] || vendor.subscription_plan;

  const handleSignOut = async (e) => {
    e.preventDefault();
    setOpen(false);
    try {
      await logout();
    } catch {
      if (typeof window !== "undefined") localStorage.removeItem("botimi_token");
    }
    router.push("/login");
  };

  const avatar = (size) => (
    <span
      className={`${size} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ background: accentColor, color: getContrastColor(accentColor) }}
    >
      {initial}
    </span>
  );

  return (
    <div className="relative" ref={ref}>
      {variant === "full" ? (
        <button
          type="button"
          title={collapsed ? displayName : undefined}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`w-full flex items-center ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2"} text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-200`}
        >
          {avatar("w-7 h-7 text-xs")}
          {!collapsed && (
            <>
              <span className="font-label-md text-label-md whitespace-nowrap truncate flex-1 text-left">{displayName}</span>
              <span className="material-symbols-outlined text-[18px] shrink-0">{open ? "expand_less" : "expand_more"}</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-surface-container transition-colors"
        >
          {avatar("w-8 h-8 text-sm")}
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
            {open ? "expand_less" : "expand_more"}
          </span>
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-2 w-64 bg-surface-container border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden`}
        >
          <div className="p-4 border-b border-outline-variant flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
              style={{ background: accentColor, color: getContrastColor(accentColor) }}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">{displayName}</p>
              <p className="text-xs text-on-surface-variant truncate">{vendor.email}</p>
            </div>
          </div>
          {planLabel && (
            <div className="px-4 py-2 border-b border-outline-variant">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">{planLabel} plan</span>
            </div>
          )}
          <div className="p-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-variant transition-colors"
              role="menuitem"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              Settings
            </Link>
            <a
              href="#"
              onClick={handleSignOut}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
              role="menuitem"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign Out
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
