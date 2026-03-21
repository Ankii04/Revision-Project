"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RevisionCard } from "@/components/revision-card";
import { formatRelativeTime } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  BarChart2,
  Calendar,
  Flame,
  Search,
  Settings,
  ArrowRight,
  TrendingUp,
  Brain,
  Link as LinkIcon,
  Tag,
  CheckCircle2,
  PlusCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Dashboard: Fetches overview stats, heatmap, and weak topics.
 * Displays user progress and revision queue status.
 */
export default function Dashboard() {
  // 1. Core Overview Stats
  const { data: stats } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      return (await res.json()).data.overview;
    },
  });

  // 2. Heatmap Data
  const { data: heatmapData } = useQuery({
    queryKey: ["analytics-heatmap"],
    queryFn: async () => {
      const res = await fetch("/api/analytics?type=heatmap");
      return (await res.json()).data;
    },
  });

  // 3. Weak Topics Data
  const { data: weakTopics } = useQuery({
    queryKey: ["analytics-weak-topics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics?type=weak-topics&limit=3");
      return (await res.json()).data;
    },
  });

  // 4. Revision Queue
  const { data: queue } = useQuery({
    queryKey: ["revision-queue"],
    queryFn: async () => {
      const res = await fetch("/api/revision/queue?limit=4");
      return (await res.json()).data.queue;
    },
  });

  const containers = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight italic">DSA REVISION</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/problems"><Search className="h-5 w-5" /></Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings"><Settings className="h-5 w-5" /></Link>
            </Button>
            <div className="h-8 w-8 rounded-full bg-border" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Row 1: Welcome & Core Cards */}
        <motion.div
          variants={containers}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {/* Welcome Card */}
          <motion.div
            variants={item}
            className="md:col-span-2 bg-gradient-to-br from-card to-card/50 border rounded-2xl p-8 flex flex-col justify-center gap-4 shadow-xl border-white/5"
          >
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              READY TO <span className="text-primary italic">CRUSH</span> IT?
            </h1>
            <p className="text-muted-foreground text-lg max-w-sm">
              You have{" "}
              <span className="text-white font-bold underline underline-offset-4 decoration-primary px-1">
                {stats?.cardsWithDueToday ?? 0} problems
              </span>{" "}
              due today. Consistency is the key to mastery.
            </p>
            <div className="pt-4 flex gap-3">
              <Button size="lg" variant="premium" className="rounded-xl px-10 h-12 italic font-black" asChild>
                <Link href="/revision">
                  START SESSION <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl border-white/10 italic font-bold" asChild>
                 <Link href="/import">IMPORT NEW</Link>
              </Button>
            </div>
          </motion.div>

          {/* Current Streak */}
          <motion.div variants={item} className="bg-card border border-white/5 rounded-2xl p-6 space-y-4 shadow-lg group hover:border-orange-500/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-black uppercase tracking-widest">STREAK RECORD</span>
              <Flame className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-1">
              <span className="text-5xl font-black italic tabular-nums text-white leading-none">
                {stats?.currentStreak ?? 0}
              </span>
              <span className="text-xs font-black ml-2 text-muted-foreground uppercase tracking-widest italic">
                DAYS
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                style={{ width: `${Math.min(((stats?.currentStreak ?? 0) / 10) * 100, 100)}%` }}
              />
            </div>
          </motion.div>

          {/* Total Problems Solved */}
          <motion.div variants={item} className="bg-card border border-white/5 rounded-2xl p-6 space-y-4 shadow-lg group hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-black uppercase tracking-widest">PROBLEMS SOLVED</span>
              <CheckCircle2 className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-1">
              <span className="text-5xl font-black italic tabular-nums text-white leading-none">
                {stats?.totalProblems ?? 0}
              </span>
              <span className="text-xs font-black ml-2 text-muted-foreground uppercase tracking-widest italic">
                SOLVED
              </span>
            </div>
            <div className="pt-2 flex flex-wrap gap-1">
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-black italic text-[9px]">{stats?.problemsByDifficulty?.EASY ?? 0} EASY</Badge>
                <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-black italic text-[9px]">{stats?.problemsByDifficulty?.MEDIUM ?? 0} MED</Badge>
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-black italic text-[9px]">{stats?.problemsByDifficulty?.HARD ?? 0} HARD</Badge>
            </div>
          </motion.div>
        </motion.div>

        {/* Row 2: Heatmap & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           <section className="lg:col-span-9 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black italic tracking-tight flex items-center gap-2 uppercase tracking-tighter">
                  <Calendar className="h-5 w-5 text-primary" />
                  REVISION CONTINUUM
                </h3>
                <Link href="/analytics" className="text-[10px] font-black italic text-muted-foreground hover:text-primary tracking-widest uppercase">
                  VIEW FULL HISTORY
                </Link>
              </div>

              <div className="bg-card border border-white/5 rounded-2xl p-6 overflow-hidden shadow-inner">
                <div className="flex gap-4">
                  {/* Day labels */}
                  <div className="flex flex-col justify-between text-[8px] font-black text-muted-foreground uppercase py-1 select-none">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                  </div>

                  {/* The Grid */}
                  <div className="grid grid-rows-7 grid-flow-col gap-1.5 overflow-x-auto pb-4 scrollbar-hide flex-1">
                    {heatmapData?.heatmap?.map((day: any) => {
                      const activity = day.totalActivity;
                      const level = activity === 0 ? 0 : activity < 2 ? 1 : activity < 4 ? 2 : 3;
                      return (
                        <div
                          key={day.date}
                          title={`${day.date}: ${activity} solutions`}
                          className={`h-3 w-3 shrink-0 rounded-[2px] border border-white/5 transition-all hover:border-white/20
                            ${
                              level === 0
                                ? "bg-white/5"
                                : level === 1
                                ? "bg-green-500/20"
                                : level === 2
                                ? "bg-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
                                : "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                            }
                          `}
                        />
                      );
                    })}
                    {(!heatmapData?.heatmap || heatmapData.heatmap.length === 0) && (
                      <div className="w-full text-center py-6 text-muted-foreground font-black italic uppercase tracking-widest text-[10px] opacity-30">
                        LOADING CONTINUUM DATA...
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 text-[10px] font-black text-muted-foreground mt-2 tracking-[0.2em] uppercase italic">
                  <span>Empty</span>
                  <div className="flex gap-1">
                    <div className="h-2.5 w-2.5 bg-white/5 rounded-[1px] border border-white/10" />
                    <div className="h-2.5 w-2.5 bg-green-500/20 rounded-[1px]" />
                    <div className="h-2.5 w-2.5 bg-green-500/50 rounded-[1px]" />
                    <div className="h-2.5 w-2.5 bg-green-500 rounded-[1px]" />
                  </div>
                  <span>Charged</span>
                </div>
              </div>
           </section>

           <section className="lg:col-span-3 space-y-6">
              <h3 className="text-xl font-black italic tracking-tight flex items-center gap-2 uppercase tracking-tighter">
                <TrendingUp className="h-5 w-5 text-primary" />
                METRICS
              </h3>
              <div className="space-y-4">
                 <div className="bg-card border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AI INSIGHTS</p>
                      <p className="text-2xl font-black italic tabular-nums text-white leading-none mt-1">{stats?.aiNotesGenerated ?? 0}</p>
                    </div>
                    <Brain className="h-8 w-8 text-purple-500 opacity-20 group-hover:opacity-60 transition-opacity" />
                 </div>
                 <div className="bg-card border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">TOPICS COVERED</p>
                      <p className="text-2xl font-black italic tabular-nums text-white leading-none mt-1">{stats?.totalUniqueTags ?? 0}</p>
                    </div>
                    <Tag className="h-8 w-8 text-cyan-500 opacity-20 group-hover:opacity-60 transition-opacity" />
                 </div>
              </div>
           </section>
        </div>

        {/* Row 3: Weak Topics & Revision Feed */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           {/* Weak Topics */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xl font-black italic tracking-tight flex items-center gap-2 uppercase tracking-tighter">
              <BarChart2 className="h-5 w-5 text-red-500" />
              WEAKEST LINKS
            </h3>
            <div className="bg-card border border-white/5 rounded-2xl p-2 divide-y divide-white/5 shadow-xl">
              {weakTopics?.length === 0 && (
                <div className="p-8 text-center text-muted-foreground font-black italic uppercase text-xs tracking-widest opacity-30">
                  NO WEAK LINKS DETECTED YET.
                </div>
              )}
              {weakTopics?.map((topic: any) => (
                <div key={topic.tag} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all group">
                  <div className="flex flex-col">
                    <span className="font-black text-lg tracking-tighter uppercase italic text-white group-hover:text-primary transition-colors">
                      #{topic.tag}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                      {topic.totalProblems} PROBLEMS IN PLAY
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="block text-2xl font-black italic text-red-500 leading-none">
                      {Math.round((1 - topic.againRatio) * 100)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest italic pt-1">RECALL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revision Feed (Recent Due) */}
          <div className="lg:col-span-7 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-black italic tracking-tight flex items-center gap-2 uppercase tracking-tighter">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  UP NEXT
                </h3>
                <Link href="/revision" className="text-xs font-black italic text-primary hover:underline underline-offset-4 uppercase tracking-widest">
                   START FULL SESSION
                </Link>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queue?.slice(0, 4).map((card: any) => (
                  <div key={card.id} className="bg-card/40 border border-white/5 rounded-2xl p-5 hover:border-primary/40 transition-all group">
                     <div className="flex items-start justify-between mb-4">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-widest italic">{card.problem.platform}</span>
                        <Badge variant="outline" className="text-[8px] border-white/10 uppercase tracking-tighter">{card.problem.difficulty}</Badge>
                     </div>
                     <h4 className="font-bold text-base text-white/90 line-clamp-1 mb-2 italic uppercase tracking-tighter group-hover:text-white transition-colors">
                        {card.problem.title}
                     </h4>
                     <div className="flex items-center justify-between mt-auto">
                        <span className="text-[9px] font-black text-muted-foreground uppercase italic tracking-widest">EASE {card.easeFactor.toFixed(1)}</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/20 hover:text-primary" asChild>
                           <Link href={`/problems/${card.problemId}`}><ArrowRight className="h-4 w-4" /></Link>
                        </Button>
                     </div>
                  </div>
                ))}
                {queue?.length === 0 && (
                  <div className="col-span-2 bg-card/40 border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4">
                     <CheckCircle2 className="h-10 w-10 text-muted-foreground opacity-20" />
                     <p className="text-muted-foreground font-black italic uppercase tracking-widest text-xs">QUEUE CLEARED. REST UP.</p>
                  </div>
                )}
             </div>
          </div>
        </section>

        {/* Row 4: Import CTA */}
        <section className="bg-gradient-to-r from-primary/10 to-transparent border-y border-primary/10 -mx-6 px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">MISSING SOMETHING?</h2>
              <p className="text-muted-foreground font-medium">Capture your latest wins from LeetCode or GeeksForGeeks instantly.</p>
           </div>
           <div className="flex gap-4">
              <Button size="lg" className="rounded-xl px-8 h-12 italic font-black shadow-lg shadow-primary/20" asChild>
                 <Link href="/import">
                    <PlusCircle className="mr-2 h-5 w-5" /> BULK IMPORT
                 </Link>
              </Button>
           </div>
        </section>
      </main>
    </div>
  );
}
