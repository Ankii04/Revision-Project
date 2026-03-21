"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowLeft,
  Upload,
  Shuffle,
  Target,
  TrendingUp,
  Flame,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";

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
  EASY: "bg-green-500/10 text-green-400 border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HARD: "bg-red-500/10 text-red-400 border-red-500/20",
  UNKNOWN: "bg-muted text-muted-foreground border-border",
};

// ── Main Component ─────────────────────────────────────────────────────────────

/**
 * RevisionQuiz — the new smart quiz system with:
 *  - Daily quota (starts at 5, adaptive increase on passing)
 *  - Random shuffle within session
 *  - Full pool rotation (no question is ever permanently skipped)
 *  - Wrong-answer re-queue
 *  - Session summary with score, streaks, pool stats
 */
export default function RevisionQuiz() {
  const queryClient = useQueryClient();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
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
    staleTime: 0,
  });

  // Submit answer mutation
  const answerMutation = useMutation({
    mutationFn: async ({
      itemId,
      correct,
    }: {
      itemId: string;
      correct: boolean;
    }) => {
      const res = await fetch("/api/revision/quiz-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, correct }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Failed to submit answer");
      }
      return await res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-state"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });

      const data = result.data;
      if (data?.completed) {
        setSessionResult({
          completed: true,
          passed: data.passed,
          nextQuota: data.nextQuota,
        });
      } else {
        // Move to next unanswered item
        moveToNext();
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to submit",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function moveToNext() {
    setRevealed(false);
    setCurrentItemIndex((prev) => prev + 1);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Brain className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-black italic uppercase tracking-widest text-sm text-primary">
              BUILDING YOUR SESSION
            </p>
            <p className="text-xs text-muted-foreground">
              Selecting & shuffling today's questions…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto opacity-60" />
          <h2 className="text-xl font-black italic uppercase">
            Couldn't Load Session
          </h2>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message ?? "Unknown error"}
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["quiz-state"] })}>
            RETRY
          </Button>
        </div>
      </div>
    );
  }

  const { session, pool } = data;
  const items = session.items;
  const unansweredItems = items.filter((i) => !i.answered);
  const answeredItems = items.filter((i) => i.answered);
  const progressPercent = (answeredItems.length / items.length) * 100;

  // ── No Problems in Pool ────────────────────────────────────────────────────
  if (pool.total === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Upload className="h-10 w-10 text-primary opacity-60" />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">
          NO PROBLEMS YET
        </h1>
        <p className="text-muted-foreground max-w-sm">
          Import your solved problems from LeetCode or add them manually. Your
          quiz pool will be built from your solved problems.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg" className="rounded-xl px-8 font-black italic">
            <Link href="/import">IMPORT FROM LEETCODE</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-xl px-8 font-black italic border-white/10"
            asChild
          >
            <Link href="/dashboard">BACK</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Session Complete → Summary Screen ─────────────────────────────────────
  if (sessionResult?.completed || (session.completed && !sessionResult)) {
    const finalSession = session;
    const correct = finalSession.correctCount;
    const total = finalSession.items.length;
    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = sessionResult?.passed ?? finalSession.passed;
    const nextQuota = sessionResult?.nextQuota ?? 5;

    return (
      <SessionSummary
        correct={correct}
        total={total}
        scorePercent={scorePercent}
        passed={passed}
        nextQuota={nextQuota}
        pool={pool}
        items={finalSession.items}
      />
    );
  }

  // Guard: if all answered but no sessionResult yet (race), show summary
  if (unansweredItems.length === 0 && answeredItems.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const currentItem = unansweredItems[0] ?? items[currentItemIndex];
  if (!currentItem) return null;

  const currentProblem = currentItem.problem;

  // ── Active Quiz UI ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md h-16 flex items-center px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4 w-full max-w-5xl mx-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              QUIT
            </span>
          </Link>

          {/* Progress bar */}
          <div className="flex-1 px-6 flex flex-col gap-1">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              <span>
                {answeredItems.length} / {items.length} DONE
              </span>
              <span className="text-primary">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>

          {/* Pool stats */}
          <div className="hidden md:flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-primary" />
              <span>
                {pool.pending} PENDING
              </span>
            </div>
            <div className="h-3 w-[1px] bg-border" />
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>LIVE SESSION</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main quiz area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="w-full space-y-6"
          >
            {/* Problem card */}
            <div className="bg-card border border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl">
              {/* Meta row */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={DIFFICULTY_COLORS[currentProblem.difficulty]}
                    >
                      {currentProblem.difficulty}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[9px] uppercase tracking-wider opacity-60"
                    >
                      {currentProblem.platform}
                    </Badge>
                    {currentProblem.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-wider"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  Q{answeredItems.length + 1} OF {items.length}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-black italic tracking-tighter leading-tight text-white">
                {currentProblem.title}
              </h2>

              {/* Reveal / Code section */}
              <AnimatePresence mode="wait">
                {!revealed ? (
                  <motion.div
                    key="hidden"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="pt-4"
                  >
                    <Button
                      size="lg"
                      className="w-full h-14 text-base font-black italic tracking-wide bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 shadow-lg shadow-primary/20 rounded-xl"
                      onClick={() => setRevealed(true)}
                    >
                      <Eye className="mr-2 h-5 w-5" />
                      REVEAL SOLUTION
                    </Button>
                    <p className="text-center text-[10px] text-muted-foreground mt-3 font-bold uppercase tracking-widest">
                      Try recalling the solution before revealing
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-6 pt-4 border-t border-white/5"
                  >
                    {/* Code block */}
                    <div className="bg-[#0b0e14] rounded-xl border border-white/5 p-5 relative group">
                      <div className="absolute top-3 right-3">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest bg-muted px-2 py-0.5 rounded">
                          {currentProblem.language}
                        </span>
                      </div>
                      <pre className="text-sm font-mono text-blue-300/90 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto pr-12">
                        {currentProblem.solutionCode}
                      </pre>
                    </div>

                    {/* Answer buttons */}
                    <div className="space-y-2">
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        HOW WELL DID YOU RECALL IT?
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          size="lg"
                          variant="outline"
                          disabled={answerMutation.isPending}
                          onClick={() =>
                            answerMutation.mutate({
                              itemId: currentItem.id,
                              correct: false,
                            })
                          }
                          className="h-14 font-black text-base border-red-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 rounded-xl transition-all group"
                        >
                          <XCircle className="mr-2 h-5 w-5 opacity-60 group-hover:opacity-100" />
                          DIDN'T GET IT
                        </Button>
                        <Button
                          size="lg"
                          disabled={answerMutation.isPending}
                          onClick={() =>
                            answerMutation.mutate({
                              itemId: currentItem.id,
                              correct: true,
                            })
                          }
                          className="h-14 font-black text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 rounded-xl shadow-md shadow-green-500/20 transition-all group"
                        >
                          {answerMutation.isPending ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-5 w-5 opacity-80 group-hover:opacity-100" />
                          )}
                          GOT IT!
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Upcoming pills */}
            {unansweredItems.length > 1 && (
              <div className="flex gap-2 flex-wrap justify-center">
                {unansweredItems.slice(1, 6).map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1 bg-card border border-white/5 px-3 py-1 rounded-full text-[9px] font-black text-muted-foreground uppercase tracking-wider"
                  >
                    <span className="text-primary opacity-60">{idx + 2}.</span>
                    <span className="max-w-[100px] truncate">
                      {item.problem.title}
                    </span>
                  </div>
                ))}
                {unansweredItems.length > 6 && (
                  <div className="bg-card border border-white/5 px-3 py-1 rounded-full text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                    +{unansweredItems.length - 6} MORE
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Session Summary Component ─────────────────────────────────────────────────

function SessionSummary({
  correct,
  total,
  scorePercent,
  passed,
  nextQuota,
  pool,
  items,
}: {
  correct: number;
  total: number;
  scorePercent: number;
  passed: boolean;
  nextQuota: number;
  pool: PoolStats;
  items: QuizItem[];
}) {
  const wrongItems = items.filter((i) => i.correct === false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-card/20">
      <div className="w-full max-w-xl space-y-8">
        {/* Trophy / Score */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="text-center space-y-4"
        >
          <div
            className={`h-24 w-24 mx-auto rounded-3xl flex items-center justify-center shadow-2xl ${
              passed
                ? "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-yellow-500/30"
                : "bg-gradient-to-br from-card to-muted shadow-none border border-white/10"
            }`}
          >
            {passed ? (
              <Trophy className="h-12 w-12 text-white" />
            ) : (
              <Brain className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <div>
            <h1 className="text-5xl font-black italic tracking-tighter leading-none">
              {passed ? "SESSION CLEARED." : "KEEP GOING."}
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              {passed
                ? "You passed today's session! Quota increases tomorrow."
                : "You didn't hit 70% — wrong answers will be re-queued for tomorrow."}
            </p>
          </div>
        </motion.div>

        {/* Score Card */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl"
        >
          {/* Big score */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                TODAY'S SCORE
              </p>
              <p className="text-6xl font-black italic tracking-tighter leading-none mt-1">
                <span className={passed ? "text-green-400" : "text-red-400"}>
                  {correct}
                </span>
                <span className="text-muted-foreground text-4xl">/{total}</span>
              </p>
            </div>
            <div className="text-right">
              <div
                className={`text-5xl font-black italic ${
                  passed ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {scorePercent}%
              </div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                {passed ? "PASSING" : "NEEDS 70%"}
              </p>
            </div>
          </div>

          {/* Score bar */}
          <div className="space-y-1">
            <Progress
              value={scorePercent}
              className={`h-3 ${
                passed ? "[&>*]:bg-green-500" : "[&>*]:bg-yellow-500"
              }`}
            />
            <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
              <span>{correct} CORRECT</span>
              <span>{total - correct} WRONG → RE-QUEUED</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatBox
              label="QUOTA TOMORROW"
              value={nextQuota}
              icon={<Target className="h-4 w-4" />}
              color={passed ? "text-green-400" : "text-muted-foreground"}
            />
            <StatBox
              label="POOL SIZE"
              value={pool.total}
              icon={<Brain className="h-4 w-4" />}
              color="text-primary"
            />
            <StatBox
              label="STILL UNSEEN"
              value={pool.pending}
              icon={<Shuffle className="h-4 w-4" />}
              color={pool.pending > 0 ? "text-yellow-400" : "text-green-400"}
            />
          </div>

          {/* Adaptive quota info */}
          {passed && nextQuota > total && (
            <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-xl p-3">
              <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
              <p className="text-xs text-green-400 font-bold">
                Quota increased to {nextQuota} questions tomorrow! Keep the
                streak going.
              </p>
            </div>
          )}
        </motion.div>

        {/* Wrong answers list */}
        {wrongItems.length > 0 && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="bg-card border border-red-500/10 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-400" />
              <p className="text-xs font-black uppercase tracking-widest text-red-400">
                RE-QUEUED FOR TOMORROW ({wrongItems.length})
              </p>
            </div>
            <div className="space-y-2">
              {wrongItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                    <span className="text-sm font-bold truncate">
                      {item.problem.title}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[8px] flex-shrink-0 ${DIFFICULTY_COLORS[item.problem.difficulty]}`}
                  >
                    {item.problem.difficulty}
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex gap-3"
        >
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-13 font-black italic border-white/10 rounded-xl"
            asChild
          >
            <Link href="/dashboard">BACK TO DASHBOARD</Link>
          </Button>
          <Button
            size="lg"
            className="flex-1 h-13 font-black italic rounded-xl bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/20"
            asChild
          >
            <Link href="/problems">
              <ChevronRight className="mr-2 h-4 w-4" />
              VIEW PROBLEMS
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ── Tiny stat box helper ───────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-background/60 rounded-xl p-3 space-y-1.5 text-center border border-white/5">
      <div className={`flex justify-center ${color}`}>{icon}</div>
      <p className={`text-2xl font-black italic tabular-nums ${color}`}>
        {value}
      </p>
      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}
