"use client";

import { Brain, Settings, User, Bell, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Settings Page: User preferences and account settings.
 */
export default function SettingsPage() {
  const sections = [
    {
      icon: User,
      title: "Account",
      description: "Manage your profile, email, and Clerk authentication settings.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "#",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Configure revision reminders and streak alerts.",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      href: "#",
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Adjust theme and display preferences.",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "#",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Manage your data, exports, and account deletion.",
      color: "text-green-500",
      bg: "bg-green-500/10",
      href: "#",
    },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter">SETTINGS</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
            Account & Preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-card border rounded-2xl p-6 flex items-center justify-between gap-6 hover:border-primary/30 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 ${section.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <section.icon className={`h-6 w-6 ${section.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight">{section.title}</h3>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>
            <Button variant="outline" className="shrink-0 group-hover:border-primary/50 transition-colors">
              Configure
            </Button>
          </div>
        ))}
      </div>

      <div className="bg-card border border-red-500/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-red-500" />
          <h3 className="font-bold text-red-400 uppercase tracking-wider text-sm">Danger Zone</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently delete all your data including problems, revision history, and AI notes. This action cannot be undone.
        </p>
        <Button variant="destructive" className="rounded-xl">
          Delete All Data
        </Button>
      </div>
    </div>
  );
}
