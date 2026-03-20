"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RevisionCard } from "@/components/revision-card";
import { formatRelativeTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  BarChart2, 
  Calendar, 
  Flame, 
  Link, 
  Search, 
  Settings, 
  ArrowRight,
  TrendingUp,
  Brain
} from "lucide-react";

/**
 * Dashboard: Fetches overview stats and problems list.
 * Includes GitHub-style heatmap and streak counter.
 */
export default function Dashboard() {
  // Fetch overview analytics
  const { data: stats } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      return (await res.json()).data.overview;
    },
  });

  // Fetch today's revision queue
  const { data: queue } = useQuery({
    queryKey: ["revision-queue"],
    queryFn: async () => {
      const res = await fetch("/api/revision/queue");
      return (await res.json()).data.queue;
    },
  });

  const containers = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">DSA REVISION</span>
          </div>
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon"><Search className="h-5 w-5" /></Button>
             <Button variant="ghost" size="icon"><Settings className="h-5 w-5" /></Button>
             <div className="h-8 w-8 rounded-full bg-border" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Welcome & Stats Row */}
        <motion.div 
          variants={containers}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <motion.div variants={item} className="md:col-span-2 bg-gradient-to-br from-card to-card/50 border rounded-2xl p-8 flex flex-col justify-center gap-4">
             <h1 className="text-4xl font-black italic tracking-tighter">GOOD LUCK, CHAMP.</h1>
             <p className="text-muted-foreground text-lg max-w-md">
               Today you have <span className="text-primary font-bold underline underline-offset-4">{stats?.cardsWithDueToday ?? 0} problems</span> awaiting review. 
               Keep the momentum up to stay sharp.
             </p>
             <div className="pt-4 flex gap-3">
               <Button size="lg" variant="premium" className="rounded-xl px-8 h-12">Start Revision <ArrowRight className="ml-2 h-4 w-4" /></Button>
             </div>
          </motion.div>

          <motion.div variants={item} className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
             <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">CURRENT STREAK</span>
                <Flame className="h-5 w-5 text-orange-500 fill-orange-500/20" />
             </div>
             <div className="space-y-1">
                <span className="text-5xl font-black italic tabular-nums">{stats?.currentStreak ?? 0}</span>
                <span className="text-sm font-semibold ml-2 text-muted-foreground uppercase tracking-widest">DAYS</span>
             </div>
             <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                   className="h-full bg-orange-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.5)]" 
                   style={{ width: `${Math.min(((stats?.currentStreak ?? 0) / 10) * 100, 100)}%` }}
                />
             </div>
          </motion.div>

          <motion.div variants={item} className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
             <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">REVIEWS COMPLETED</span>
                <TrendingUp className="h-5 w-5 text-green-500" />
             </div>
             <div className="space-y-1">
                <span className="text-5xl font-black italic tabular-nums">{stats?.totalReviews ?? 0}</span>
                <span className="text-sm font-semibold ml-2 text-muted-foreground uppercase tracking-widest">TOTAL</span>
             </div>
             <div className="flex gap-1 pt-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-4 w-full rounded-[3px] bg-green-500/20 last:bg-green-500" />
                ))}
             </div>
          </motion.div>
        </motion.div>

        {/* Heatmap Placeholder Section (Phase 5 Analytics functionality) */}
        <section className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                ACTIVITY HEATMAP
              </h3>
              <Button variant="ghost" size="sm" className="text-muted-foreground">VIEW ALL TIME</Button>
           </div>
           
           <div className="bg-card border rounded-2xl p-6 overflow-hidden">
              <div className="flex gap-1.5 max-w-full overflow-x-auto pb-4">
                {[...Array(52)].map((_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1.5">
                    {[...Array(7)].map((_, dayIndex) => {
                      const isActive = Math.random() > 0.7; // Simulated activity
                      return (
                        <div 
                          key={dayIndex} 
                          className={`h-4 w-4 rounded-[2px] border border-white/5 transition-all
                            ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-muted/50'}
                          `}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-muted-foreground mt-2 tracking-widest uppercase">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="h-3 w-3 bg-muted/50 rounded-[2px]" />
                  <div className="h-3 w-3 bg-green-500/30 rounded-[2px]" />
                  <div className="h-3 w-3 bg-green-500/60 rounded-[2px]" />
                  <div className="h-3 w-3 bg-green-500 rounded-[2px]" />
                </div>
                <span>More</span>
              </div>
           </div>
        </section>

        {/* Weak Topics Row (Phase 5 feature) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-muted-foreground" />
                WEAK TOPICS
              </h3>
              <div className="bg-card border rounded-2xl p-2 divide-y">
                {[
                  { tag: "dynamic-programming", count: 24, quality: 65, color: "text-red-400" },
                  { tag: "binary-search", count: 18, quality: 72, color: "text-orange-400" },
                  { tag: "graphs", count: 12, quality: 78, color: "text-yellow-400" },
                ].map((topic) => (
                  <div key={topic.tag} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-lg tracking-tight uppercase tracking-tighter italic">#{topic.tag}</span>
                      <span className="text-xs text-muted-foreground font-mono">{topic.count} problems solved</span>
                    </div>
                    <div className="text-right">
                       <span className={`block text-2xl font-black italic ${topic.color}`}>{topic.quality}%</span>
                       <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">RECALL QUALITY</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <Link className="h-5 w-5 text-muted-foreground" />
                  IMPORT SOURCES
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border rounded-2xl p-6 flex flex-col gap-4 group hover:border-primary/50 transition-colors">
                     <div className="h-10 w-10 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                        <span className="text-yellow-500 font-black italic">LC</span>
                     </div>
                     <div>
                        <h4 className="font-bold text-lg">LEETCODE</h4>
                        <p className="text-sm text-muted-foreground">Bulk import submissions via session cookie.</p>
                     </div>
                     <Button variant="outline" className="mt-auto group-hover:bg-primary group-hover:text-primary-foreground transition-all">Import Now</Button>
                  </div>
                  <div className="bg-card border rounded-2xl p-6 flex flex-col gap-4 group hover:border-primary/50 transition-colors">
                     <div className="h-10 w-10 bg-green-400/10 rounded-lg flex items-center justify-center">
                        <span className="text-green-500 font-black italic">GFG</span>
                     </div>
                     <div>
                        <h4 className="font-bold text-lg">GEEKS FOR GEEKS</h4>
                        <p className="text-sm text-muted-foreground">Sync your practice history seamlessly.</p>
                     </div>
                     <Button variant="outline" className="mt-auto group-hover:bg-primary group-hover:text-primary-foreground transition-all">Import Now</Button>
                  </div>
                </div>
            </div>
        </section>
      </main>
    </div>
  );
}
