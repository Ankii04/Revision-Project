"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RevisionCard } from "@/components/revision-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Trophy, Brain } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";

/**
 * Revision Mode: Interactive multi-step flashcard session.
 * Updates SM-2 schedule via mutation after each review.
 */
export default function RevisionMode() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // 1. Fetch the queue
  const { data: queue, isLoading } = useQuery({
    queryKey: ["revision-queue"],
    queryFn: async () => {
      const res = await fetch("/api/revision/queue");
      return (await res.json()).data.queue;
    },
  });

  // 2. Mutation for submitting ratings
  const mutation = useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: string }) => {
      const res = await fetch("/api/revision/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionCardId: cardId, rating }),
      });
      return await res.json();
    },
    onSuccess: () => {
       // Move to next problem after a successful review
       if (queue && currentIndex < queue.length - 1) {
          setCurrentIndex(prev => prev + 1);
       } else {
          setIsFinished(true);
       }
       // Refetch stats to keep streak updated
       queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
    },
    onError: () => {
       toast({
         title: "Review failed",
         description: "Could not save your progress. Please try again.",
         variant: "destructive",
       });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="h-10 w-10 text-primary animate-spin" />
           <p className="text-muted-foreground font-mono uppercase tracking-[0.2em] animate-pulse">Initializing Queue...</p>
        </div>
      </div>
    );
  }

  if (!queue || queue.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 space-y-6 text-center">
         <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center">
            <Trophy className="h-10 w-10 text-green-500" />
         </div>
         <h1 className="text-4xl font-black italic tracking-tighter">ALL CLEAR.</h1>
         <p className="text-muted-foreground text-lg max-w-sm">No problems are due for revision today. Take some rest or solve new problems on LeetCode!</p>
         <Link href="/dashboard"><Button size="lg" className="rounded-xl px-12">Back to Dashboard</Button></Link>
      </div>
    );
  }

  if (isFinished) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 space-y-8 text-center bg-gradient-to-b from-background to-card">
           <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="h-24 w-24 bg-primary rounded-3xl flex items-center justify-center shadow-[0_0_32px_rgba(59,130,246,0.5)]"
           >
              <Trophy className="h-12 w-12 text-primary-foreground" />
           </motion.div>
           <div className="space-y-4">
              <h1 className="text-5xl font-black italic tracking-tighter">SESSION COMPLETE.</h1>
              <p className="text-muted-foreground text-xl max-w-sm">You've successfully revised <span className="text-primary font-bold">{queue.length} problems</span> today.</p>
           </div>
           <form action="/dashboard">
              <Button size="lg" variant="premium" className="rounded-xl px-16 h-14 font-black text-xl italic tracking-tighter">DONE</Button>
           </form>
        </div>
      );
  }

  const currentProblem = queue[currentIndex];
  const progressPercent = ((currentIndex + 1) / queue.length) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
       <header className="border-b bg-card/50 backdrop-blur-md h-16 flex items-center px-6 sticky top-0 z-50">
          <div className="flex items-center gap-4 w-full justify-between max-w-4xl mx-auto">
             <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">QUIT SESSION</span>
             </Link>
             <div className="flex flex-col items-center gap-1 flex-1 px-8">
                <span className="text-[10px] font-black italic tracking-widest text-primary uppercase">PROGRESS: {currentIndex + 1} / {queue.length}</span>
                <Progress value={progressPercent} className="h-1.5 w-full max-w-[200px]" />
             </div>
             <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ACIVE SESSION</span>
             </div>
          </div>
       </header>

       <main className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-card/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProblem.problem.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="w-full"
            >
              <RevisionCard
                problem={currentProblem.problem}
                onReview={(rating) => mutation.mutate({ cardId: currentProblem.id, rating })}
                isLoading={mutation.isPending}
              />
            </motion.div>
          </AnimatePresence>
       </main>

       {/* AI Insights Floating Indicator */}
       {currentProblem.aiNotes?.status === "DONE" && (
         <div className="fixed bottom-10 left-10 hidden xl:flex flex-col gap-2 max-w-[280px] bg-card border rounded-2xl p-4 shadow-xl border-primary/20 bg-primary/5 backdrop-blur-sm group">
            <div className="flex items-center gap-2 text-primary font-bold italic tracking-tighter uppercase text-sm">
               <Brain className="h-4 w-4" />
               AI INSIGHT
            </div>
            <p className="text-xs leading-relaxed text-blue-200/80 line-clamp-3">
              {currentProblem.aiNotes.content.keyInsight}
            </p>
         </div>
       )}
    </div>
  );
}
