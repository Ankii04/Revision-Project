"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowLeft,
  Code2,
  Lock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  FileText,
  MessageSquare,
  History,
  Info,
  ExternalLink,
  Target,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface QuizProblem {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "UNKNOWN";
  tags: string[];
  solutionCode: string;
  language: string;
  platform: string;
  platformUrl?: string | null;
  description?: string | null;
  aiNotes?: {
    content: any;
    status: string;
  } | null;
}

interface QuizItem {
  id: string;
  problemId: string;
  answered: boolean;
  correct: boolean | null;
  problem: QuizProblem;
}

interface QuizSession {
  id: string;
  date: string;
  quota: number;
  passed: boolean;
  completed: boolean;
  correctCount: number;
  wrongCount: number;
  items: QuizItem[];
}

interface PoolStats {
  total: number;
  seen: number;
  pending: number;
}

interface QuizState {
  session: QuizSession;
  pool: PoolStats;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS = {
  EASY: "text-green-500",
  MEDIUM: "text-yellow-500",
  HARD: "text-red-500",
  UNKNOWN: "text-slate-500",
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RevisionQuiz() {
  const queryClient = useQueryClient();
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [codeAttempt, setCodeAttempt] = useState<Record<string, string>>({});
  const [contentTab, setContentTab] = useState<"description" | "solution">("description");
  const [sessionResult, setSessionResult] = useState<{
    completed: boolean;
    passed: boolean;
    nextQuota: number;
  } | null>(null);

  // Fetch today's quiz state
  const { data, isLoading, error } = useQuery<QuizState>({
    queryKey: ["quiz-state"],
    queryFn: async () => {
      const res = await fetch("/api/revision/quiz-state");
      if (!res.ok) throw new Error("Failed to load quiz session");
      return (await res.json()).data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Submit answer mutation
  const answerMutation = useMutation({
    mutationFn: async ({ itemId, correct }: { itemId: string; correct: boolean }) => {
      const res = await fetch("/api/revision/quiz-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, correct }),
      });
      if (!res.ok) throw new Error("Submission Failed");
      return (await res.json()).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-state"] });
      if (data?.completed) {
        setSessionResult({ completed: true, passed: data.passed, nextQuota: data.nextQuota });
      } else {
        // Auto-switch to next unanswered
        const items = queryClient.getQueryData<QuizState>(["quiz-state"])?.session?.items || [];
        const nextIdx = items.findIndex((i, idx) => !i.answered && idx > activeItemIndex);
        const finalNext = nextIdx !== -1 ? nextIdx : items.findIndex(i => !i.answered);
        if (finalNext !== -1) setActiveItemIndex(finalNext);
      }
    },
  });

  const session = data?.session;
  const items = session?.items || [];
  const currentItem = items[activeItemIndex];
  const currentProblem = currentItem?.problem;
  const progressPercent = items.length > 0 ? (items.filter(i => i.answered).length / items.length) * 100 : 0;

  if (isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><p className="font-black italic text-primary animate-pulse tracking-widest">BOOTING INTERFACE...</p></div>;
  if (error || !data) return <div className="h-screen bg-slate-950 flex items-center justify-center p-8 text-center"><p className="text-red-500 font-bold uppercase tracking-widest">Failed to initialize session sync.</p></div>;

  if (sessionResult?.completed || (session?.completed && !sessionResult)) {
    return (
      <QuizSummary
        correct={session?.correctCount || 0}
        total={items.length}
        passed={sessionResult?.passed ?? session?.passed ?? false}
        nextQuota={sessionResult?.nextQuota ?? 5}
        items={items}
        pool={data.pool}
      />
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0c] text-slate-300 flex flex-col overflow-hidden SelectionHighlight">
      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="h-12 border-b border-white/5 bg-[#0a0a0c] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-white transition-all"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h1 className="font-bold text-xs uppercase tracking-[0.2em] italic text-white">Revision Interface</h1>
          </div>
        </div>

        <div className="flex items-center gap-8 flex-1 max-w-xl px-12">
           <div className="flex-1 flex flex-col gap-1">
             <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                <span>Progress: {items.filter(i => i.answered).length} / {items.length}</span>
                <span className="text-primary">{Math.round(progressPercent)}%</span>
             </div>
             <Progress value={progressPercent} className="h-1" />
           </div>
        </div>

        <div className="flex items-center gap-3">
           <Badge variant="outline" className="text-[10px] border-white/5 bg-white/5 uppercase font-bold tracking-tighter hidden sm:flex">
             {items.length} QUESTIONS TOTAL
           </Badge>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── FAR-LEFT SLIM NAVBAR (Numbers Only) ────────── */}
        <aside className="w-14 border-r border-white/5 bg-[#0d0d0f] flex flex-col items-center py-4 gap-2 shrink-0 overflow-y-auto scrollbar-hide">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveItemIndex(idx)}
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center font-black italic text-sm transition-all relative border",
                activeItemIndex === idx ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10",
                item.answered && activeItemIndex !== idx && "opacity-40"
              )}
            >
              {idx + 1}
              {item.answered && (
                <div className={cn("absolute -top-1 -right-1 h-3 w-3 rounded-full border border-[#0d0d0f] flex items-center justify-center", item.correct ? "bg-green-500" : "bg-red-500")}>
                  {item.correct ? <CheckCircle2 className="h-2 w-2 text-white" /> : <XCircle className="h-2 w-2 text-white" />}
                </div>
              )}
            </button>
          ))}
        </aside>

        {/* ── CONTENT AREA (LeetCode Layout) ──────────────── */}
        <div className="flex-1 flex overflow-hidden">
           {/* LEFT PANEL: PROBLEM DETAIL ────────────────────── */}
           <div className="w-[45%] border-r border-white/5 flex flex-col bg-[#0a0a0c] shrink-0 overflow-hidden">
              <div className="h-10 border-b border-white/5 bg-[#0d0d0f] flex items-center px-4 gap-4 shrink-0 overflow-x-auto scrollbar-hide">
                 <button onClick={() => setContentTab("description")} className={cn("text-[9px] font-black uppercase tracking-widest h-full flex items-center px-2 transition-all border-b-2", contentTab === "description" ? "border-primary text-white" : "border-transparent text-slate-500")}>
                   <FileText className="h-3 w-3 mr-2" /> Description
                 </button>
                 <button onClick={() => setContentTab("solution")} className={cn("text-[9px] font-black uppercase tracking-widest h-full flex items-center px-2 transition-all border-b-2", contentTab === "solution" ? "border-primary text-white" : "border-transparent text-slate-500")}>
                   <Lock className="h-3 w-3 mr-2" /> Discussion & Solution
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {contentTab === "description" ? (
                    <motion.div key="desc" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                       <div className="space-y-3">
                          <h2 className="text-2xl font-black italic tracking-tighter text-white underline decoration-primary underline-offset-8">
                            {activeItemIndex + 1}. {currentProblem?.title}
                          </h2>
                          <div className="flex items-center gap-3 pt-2">
                             <span className={cn("font-black italic text-xs uppercase tracking-widest", DIFFICULTY_COLORS[currentProblem?.difficulty ?? 'UNKNOWN'])}>
                               {currentProblem?.difficulty}
                             </span>
                             <div className="h-3 w-[1px] bg-white/10" />
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{currentProblem?.platform}</span>
                             <div className="h-3 w-[1px] bg-white/10" />
                             <div className="flex gap-2">
                               {currentProblem?.tags.slice(0, 3).map(t => <span key={t} className="text-[9px] font-bold text-slate-600 uppercase">#{t}</span>)}
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-primary">
                                <Info className="h-4 w-4" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Problem Description</h4>
                             </div>
                             <div className="bg-white/2 border border-white/5 rounded-2xl p-6 shadow-inner">
                                <div className="text-sm text-slate-300 leading-relaxed font-medium prose prose-invert max-w-none">
                                   {currentProblem?.description ? (
                                      <div dangerouslySetInnerHTML={{ __html: currentProblem.description }} />
                                   ) : (currentItem as any).problem.aiNotes?.status === "PROCESSING" ? (
                                      <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                                         <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Gemini is reconstructing this problem for you now...</p>
                                      </div>
                                   ) : (
                                      <p>{(currentItem as any).problem.aiNotes?.content?.problemDescription || 
                                       "Awaiting detailed technical breakdown from Gemini... Use the 'Key Insight' below and original code to trigger your recall in the meantime."}</p>
                                   )}
                                </div>
                                {currentProblem?.platformUrl && (
                                   <div className="pt-4 mt-4 border-t border-white/5">
                                      <a href={currentProblem.platformUrl} target="_blank" className="inline-flex items-center text-[9px] font-black text-primary uppercase hover:underline">
                                         Open original in {currentProblem.platform} <ExternalLink className="h-3 w-3 ml-1" />
                                      </a>
                                   </div>
                                )}
                             </div>
                          </div>

                          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Lightbulb className="h-12 w-12 text-primary" /></div>
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Key Flashcard Insight</h4>
                             <p className="text-sm text-slate-300 italic leading-relaxed">
                                {(currentItem as any).problem.aiNotes?.content?.keyInsight || 
                                 "Identify the pattern: Sliding Window, Two Pointers, or DP?"}
                             </p>
                          </div>
                       </div>
                    </motion.div>
                  ) : (
                    <motion.div key="sol" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 flex flex-col h-full">
                       <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <p className="text-xs font-bold text-slate-400">Comparing your memory with the actual solution often leads to the highest retention rate.</p>
                       </div>
                       <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                          <div className="p-3 border-b border-white/5 flex items-center justify-between px-5 bg-slate-900/30">
                             <span className="text-[9px] font-black uppercase text-primary italic">Correct Base Logic ({currentProblem?.language})</span>
                             <History className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="flex-1 overflow-auto p-6 font-mono text-sm leading-relaxed text-blue-300/80 scrollbar-thin">
                             <pre className="whitespace-pre-wrap">{currentProblem?.solutionCode}</pre>
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
           </div>

           {/* RIGHT PANEL: EDITOR ───────────────────────────── */}
           <div className="flex-1 flex flex-col bg-[#0b0e14] relative overflow-hidden">
              <div className="h-10 border-b border-white/5 bg-[#0d0d0f] flex items-center px-4 justify-between shrink-0">
                 <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Memory Buffer ({currentProblem?.language || "CPP"})</span>
                 </div>
                 <Badge variant="outline" className="text-[8px] font-mono border-white/10 uppercase py-0 px-2 h-5">AUTOSAVE: ON</Badge>
              </div>

              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={currentProblem?.language?.toLowerCase() || "cpp"}
                  value={codeAttempt[currentItem.id] || ""}
                  onChange={(v) => currentItem && setCodeAttempt(p => ({ ...p, [currentItem.id]: v || "" }))}
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: false },
                    padding: { top: 24, bottom: 24 },
                    lineNumbers: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: "on",
                  }}
                />
              </div>

              {/* ACTION FOOTER ─────────────────────────────── */}
              <footer className="h-14 border-t border-white/10 bg-[#0d0d0f] flex items-center px-6 justify-between shrink-0">
                 {!currentItem.answered ? (
                   <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                         <Target className="h-4 w-4 text-primary opacity-50" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Mark yourself based on the comparison tab</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => answerMutation.mutate({ itemId: currentItem!.id, correct: false })}
                          disabled={answerMutation.isPending}
                          className="h-9 px-6 rounded-lg font-black text-[10px] uppercase italic bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                        >
                          Mark Wrong
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => answerMutation.mutate({ itemId: currentItem!.id, correct: true })}
                          disabled={answerMutation.isPending}
                          className="h-9 px-6 rounded-lg font-black text-[10px] uppercase italic bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20"
                        >
                          {answerMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Got it Correct</>}
                        </Button>
                      </div>
                   </div>
                 ) : (
                   <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center border", currentItem!.correct ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
                           {currentItem!.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <span className={cn("text-[10px] font-black uppercase italic", currentItem!.correct ? "text-green-500" : "text-red-500")}>
                           {currentItem!.correct ? "Accepted Review" : "Needs Further Practice"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const nextIdx = items.findIndex((i, idx) => !i.answered && idx > activeItemIndex);
                          const finalNext = nextIdx !== -1 ? nextIdx : items.findIndex(i => !i.answered);
                          if (finalNext !== -1) setActiveItemIndex(finalNext);
                        }}
                        className="h-9 px-5 rounded-lg font-black text-[10px] uppercase italic bg-white/5 border border-white/10 text-white hover:bg-white/10"
                      >
                         Jump to next <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                   </div>
                 )}
              </footer>
           </div>
        </div>
      </div>
    </div>
  );
}

// ── Summary Page (Unchanged but ensuring it exists) ───────────────────────────

function QuizSummary({ correct, total, passed, nextQuota, items, pool }: { correct: number, total: number, passed: boolean, nextQuota: number, items: QuizItem[], pool: PoolStats }) {
  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-8 overflow-y-auto">
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl space-y-12">
          <div className="text-center space-y-4">
             <div className="h-20 w-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center border border-primary/20"><Trophy className="h-10 w-10 text-primary" /></div>
             <h1 className="text-5xl font-black italic tracking-tighter uppercase underline decoration-primary underline-offset-8">Session Completed</h1>
             <p className="text-slate-500 uppercase font-bold tracking-widest text-sm">Accuracy: {Math.round((correct / total) * 100)}%</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
             <StatItem label="SOLVED" value={`${correct}/${total}`} sub="Accuracy" color="text-primary" />
             <StatItem label="TOMORROW" value={nextQuota} sub="New Quota" color="text-white" />
             <StatItem label="PENDING" value={pool.pending} sub="In Pool" color="text-yellow-500" />
          </div>

          <div className="flex gap-4 pt-8">
             <Button asChild variant="outline" className="flex-1 h-16 rounded-2xl font-black italic uppercase border-white/10"><Link href="/dashboard">Dashboard</Link></Button>
             <Button asChild className="flex-1 h-16 rounded-2xl font-black italic uppercase bg-primary text-white shadow-xl shadow-primary/20"><Link href="/problems">Problems</Link></Button>
          </div>
       </motion.div>
    </div>
  );
}

function StatItem({ label, value, sub, color }: any) {
  return (
    <div className="bg-white/2 border border-white/5 p-8 rounded-[2rem] text-center space-y-2">
      <div className={cn("text-4xl font-black italic", color)}>{value}</div>
      <div className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{label}</div>
    </div>
  );
}
