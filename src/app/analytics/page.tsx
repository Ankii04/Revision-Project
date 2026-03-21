"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, Tag, Calendar, Brain, Flame } from "lucide-react";

/**
 * Analytics Page: Displays full breakdown of user's DSA revision statistics.
 * Shows problem counts by difficulty/platform, weak topics, and topic breakdown.
 */
export default function AnalyticsPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      return (await res.json()).data.overview;
    },
  });

  const { data: weakTopics, isLoading: weakLoading } = useQuery({
    queryKey: ["analytics-weak-topics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics?type=weak-topics&limit=10");
      return (await res.json()).data;
    },
  });

  const { data: topicBreakdown } = useQuery({
    queryKey: ["analytics-topic-breakdown"],
    queryFn: async () => {
      const res = await fetch("/api/analytics?type=topic-breakdown");
      return (await res.json()).data;
    },
  });

  const containers = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  const statCards = [
    {
      label: "Total Problems",
      value: overview?.totalProblems ?? 0,
      icon: BarChart2,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Current Streak",
      value: `${overview?.currentStreak ?? 0} days`,
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Longest Streak",
      value: `${overview?.longestStreak ?? 0} days`,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "AI Notes Done",
      value: overview?.aiNotesGenerated ?? 0,
      icon: Brain,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Total Reviews",
      value: overview?.totalReviews ?? 0,
      icon: Calendar,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Unique Topics",
      value: overview?.totalUniqueTags ?? 0,
      icon: Tag,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-4xl font-black italic tracking-tighter">ANALYTICS</h1>
        <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">
          Your complete DSA revision statistics
        </p>
      </div>

      {/* Stat Cards */}
      <motion.div
        variants={containers}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            variants={item}
            className="bg-card border rounded-2xl p-6 space-y-3 hover:border-primary/20 transition-colors"
          >
            <div className={`h-10 w-10 ${card.bg} rounded-xl flex items-center justify-center`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-3xl font-black italic tabular-nums">{card.value}</p>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                {card.label}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Difficulty Breakdown */}
      {overview && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">DIFFICULTY BREAKDOWN</h2>
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            {[
              { key: "EASY", label: "Easy", color: "bg-green-500", textColor: "text-green-500" },
              { key: "MEDIUM", label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-500" },
              { key: "HARD", label: "Hard", color: "bg-red-500", textColor: "text-red-500" },
            ].map(({ key, label, color, textColor }) => {
              const count = overview.problemsByDifficulty[key] ?? 0;
              const pct = overview.totalProblems > 0 ? (count / overview.totalProblems) * 100 : 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`font-bold uppercase tracking-widest text-sm ${textColor}`}>
                      {label}
                    </span>
                    <span className="text-white font-black tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Weak Topics */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">WEAK TOPICS</h2>
        <div className="bg-card border rounded-2xl p-2 divide-y">
          {weakLoading && (
            <p className="p-4 text-muted-foreground font-black italic animate-pulse">Loading...</p>
          )}
          {weakTopics?.length === 0 && (
            <p className="p-4 text-muted-foreground text-sm font-bold uppercase tracking-widest">
              Not enough review data yet. Keep revising!
            </p>
          )}
          {weakTopics?.map((topic: any) => (
            <div
              key={topic.tag}
              className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-bold text-base uppercase italic">#{topic.tag}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {topic.totalProblems} problems — {Math.round(topic.againRatio * 100)}% "Again" rate
                </span>
              </div>
              <div className="text-right">
                <span className="block text-xl font-black italic text-red-400">
                  {Math.round((1 - topic.againRatio) * 100)}%
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  Recall
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Topic Breakdown */}
      {topicBreakdown && topicBreakdown.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">TOPIC BREAKDOWN</h2>
          <div className="bg-card border rounded-2xl p-2 divide-y">
            {topicBreakdown.slice(0, 15).map((t: any) => (
              <div key={t.tag} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                <span className="font-bold text-sm uppercase italic">#{t.tag}</span>
                <span className="text-white font-black tabular-nums">{t.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
