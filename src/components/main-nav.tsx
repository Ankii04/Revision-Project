"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Brain,
  ListTodo,
  TrendingUp,
  Settings,
  PlusCircle,
  Import,
} from "lucide-react";

/**
 * MainNav: Persistent side navigation for the entire authenticated app.
 */
export function MainNav() {
  const pathname = usePathname();

  const routes = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Revision Queue",
      icon: Brain,
      href: "/revision",
      active: pathname === "/revision",
    },
    {
      label: "My Problems",
      icon: ListTodo,
      href: "/problems",
      active: pathname.startsWith("/problems"),
    },
    {
       label: "Bulk Import",
       icon: Import,
       href: "/import",
       active: pathname.startsWith("/import"),
    },
    {
      label: "Analytics",
      icon: TrendingUp,
      href: "/analytics",
      active: pathname === "/analytics",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-white/5 w-64 fixed left-0 top-0 z-[100] p-6 space-y-8">
      <div className="flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tighter italic text-white underline underline-offset-4 decoration-primary">REVISION</span>
      </div>

      <nav className="flex-1 space-y-2">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 pb-2">Main Menu</div>
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group",
              route.active 
                ? "bg-primary text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <route.icon className={cn("h-5 w-5", route.active ? "text-white" : "text-slate-500 group-hover:text-white")} />
            {route.label}
          </Link>
        ))}
      </nav>

      <div className="pt-8 border-t border-white/5">
        <Link 
          href="/import" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <PlusCircle className="h-5 w-5" />
          Add Problem
        </Link>
        <Link 
          href="/settings" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all mt-2"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </div>
  );
}
