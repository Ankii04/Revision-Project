"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Platform, Language, Difficulty } from "@prisma/client";

interface RevisionCardProps {
  problem: {
    id: string;
    title: string;
    difficulty: Difficulty;
    platform: Platform;
    language: Language;
    tags: string[];
    solutionCode: string;
    platformUrl?: string | null;
  };
  onReview: (rating: "AGAIN" | "HARD" | "GOOD" | "EASY") => void;
  isLoading?: boolean;
}

export function RevisionCard({ problem, onReview, isLoading }: RevisionCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const difficultyColors = {
    EASY: "bg-green-500/10 text-green-500 border-green-500/20",
    MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    HARD: "bg-red-500/10 text-red-500 border-red-500/20",
    UNKNOWN: "bg-muted text-muted-foreground",
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="relative group bg-card border rounded-2xl p-8 shadow-2xl overflow-hidden min-h-[300px] flex flex-col justify-center gap-6"
      >
        <div className="absolute top-0 right-0 p-4 flex gap-2">
            <Badge variant="outline" className={difficultyColors[problem.difficulty]}>
              {problem.difficulty}
            </Badge>
            <Badge variant="secondary" className="opacity-70">
              {problem.platform}
            </Badge>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
            {problem.title}
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {problem.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-wider">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {!isRevealed ? (
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="pt-8"
            >
              <Button 
                 size="lg" 
                 variant="premium" 
                 className="w-full h-14 text-lg font-bold shadow-indigo-500/20"
                 onClick={() => setIsRevealed(true)}
              >
                Show Solution
              </Button>
            </motion.div>
        ) : (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-8 pt-8 border-t border-border/50"
          >
            <div className="bg-[#0b0e14] rounded-xl border p-4 group-hover:bg-[#0d1117] transition-colors relative">
               <div className="absolute top-2 right-2 flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{problem.language}</span>
               </div>
               <pre className="text-sm font-mono text-blue-300 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[300px]">
                 {problem.solutionCode}
               </pre>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { rating: "AGAIN", label: "Again", color: "hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40" },
                { rating: "HARD", label: "Hard", color: "hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/40" },
                { rating: "GOOD", label: "Good", color: "hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/40" },
                { rating: "EASY", label: "Easy", color: "hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/40" },
              ].map(({ rating, label, color }) => (
                <Button
                  key={rating}
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => onReview(rating as any)}
                  className={`h-12 text-sm font-semibold transition-all duration-300 ${color}`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
