"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";


import {
  Brain,
  Code,
  ExternalLink,
  Lightbulb,
  TrendingUp,
  Zap,
  RotateCw,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";

/** Type-safe shape of the Gemini AI notes content stored as JSON in the DB */
interface AiApproach {
  name: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
}

interface AiContent {
  keyInsight: string;
  approaches: AiApproach[];
}

/**
 * Safely casts the Prisma `Json` field to our typed AiContent interface.
 * Returns null if the structure doesn't match expectations.
 */
function parseAiContent(raw: unknown): AiContent | null {
  if (!raw || typeof raw !== "object") return null;
  const content = raw as Record<string, unknown>;
  if (typeof content["keyInsight"] !== "string") return null;
  if (!Array.isArray(content["approaches"])) return null;
  return {
    keyInsight: content["keyInsight"] as string,
    approaches: content["approaches"] as AiApproach[],
  };
}

/**
 * Problem Detail: Displays original solution side-by-side with AI analysis.
 * Features tabs for brute-force vs optimal approaches.
 */
export default function ProblemDetail() {
  const { id } = useParams();

  // 1. Fetch the problem data (includes AI notes)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["problem-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/problems/${id}`);
      if (!res.ok) throw new Error("Failed to fetch problem");
      return (await res.json()).data.problem;
    },
    // Poll every 3 seconds while Gemini is still generating
    refetchInterval: (query) => {
      const status = query.state.data?.aiNotes?.status;
      return status === "PENDING" || status === "PROCESSING" ? 3000 : false;
    },
    staleTime: 30 * 1000, // Don't refetch on window focus unless 30s old
  });

  // 2. Mutation for regenerating AI notes
  const regenerateMutation = useMutation({
    mutationFn: async () => {
       // POST to /api/ai-notes/[problemId] — no /generate sub-path exists
       const res = await fetch(`/api/ai-notes/${id}`, { method: "POST" });
       if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Generation failed");
      }
       return await res.json();
    },
    onSuccess: () => {
       // Start polling immediately so UI updates as soon as notes are ready
       refetch();
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
         <div className="h-10 w-96 bg-muted rounded-xl animate-pulse" />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
            <div className="bg-muted rounded-2xl animate-pulse" />
            <div className="bg-muted rounded-2xl animate-pulse" />
         </div>
      </div>
    );
  }

  const problem = data;
  const aiNotes = problem?.aiNotes;
  // Safely parse the Prisma Json field — never crash on malformed/null data
  const aiContent: AiContent | null =
    aiNotes?.status === "DONE" ? parseAiContent(aiNotes.content) : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="border-b bg-card/10 backdrop-blur-md sticky top-0 z-10 px-6 h-16 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground font-bold text-xs uppercase hover:text-foreground">BACK</Link>
            <div className="h-4 w-[1px] bg-border" />
            <h1 className="font-bold text-lg max-w-[400px] truncate">{problem?.title}</h1>
         </div>
         <div className="flex gap-3">
             {problem?.platformUrl && (
                <Button variant="outline" size="sm" asChild>
                   <a href={problem.platformUrl} target="_blank" rel="noreferrer">
                      VIEW ON {problem.platform} <ExternalLink className="ml-2 h-3 w-3" />
                   </a>
                </Button>
             )}
         </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* Left Column: Solution Viewer */}
         <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold italic uppercase tracking-tighter">MY SOLUTION</h3>
                  <Badge variant="outline" className="text-[10px] ml-2 font-mono uppercase tracking-widest">{problem?.language}</Badge>
               </div>
               <span className="text-xs text-muted-foreground font-bold">SOLVED {formatRelativeTime(problem?.submittedAt)}</span>
            </div>
            
            <div className="bg-[#0b0e14] rounded-2xl border p-8 font-mono text-sm text-blue-300 leading-relaxed shadow-xl overflow-hidden group">
               <pre className="whitespace-pre-wrap max-h-[800px] overflow-y-auto pr-4 scrollbar-thin">
                  {problem?.solutionCode ?? "// No solution code available"}
               </pre>
            </div>
         </div>

         {/* Right Column: AI Analysis Panel */}
         <div className="lg:col-span-5 space-y-8">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 space-y-6 backdrop-blur-sm sticky top-24">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Brain className="h-6 w-6" />
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">AI INSIGHTS</h3>
                  </div>
                  {aiNotes?.status === "DONE" && (
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-primary hover:bg-primary/10"
                        onClick={() => regenerateMutation.mutate()}
                        disabled={regenerateMutation.isPending}
                        title="Regenerate AI Analysis"
                     >
                        <RotateCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                     </Button>
                  )}
               </div>

               <AnimatePresence mode="wait">
                  {/* DONE state — show parsed content */}
                  {aiNotes?.status === "DONE" && aiContent ? (
                    <motion.div 
                      key="done"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                       <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 relative overflow-hidden">
                          <Lightbulb className="absolute -top-3 -right-3 h-10 w-10 text-primary opacity-20" />
                          <p className="text-blue-100 font-medium leading-relaxed italic text-sm">
                             &ldquo;{aiContent.keyInsight}&rdquo;
                          </p>
                       </div>

                       <div className="space-y-5">
                          {aiContent.approaches.map((approach: any, i: number) => (
                            <div key={approach.name} className="space-y-2 border-l-2 border-primary/30 pl-4 py-1">
                               <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-xs font-black italic text-primary uppercase tracking-widest">{approach.name}</span>
                                  <div className="flex gap-2 flex-wrap">
                                     <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-primary/20 py-0 font-mono">{approach.timeComplexity}</Badge>
                                     <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-primary/20 py-0 font-mono">{approach.spaceComplexity}</Badge>
                                  </div>
                               </div>
                               <p className="text-sm text-muted-foreground leading-relaxed">{approach.description}</p>
                            </div>
                          ))}
                       </div>

                       <div className="pt-4 border-t border-primary/10 flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">NEXT REVISION</span>
                             <span className="text-sm font-bold tracking-tight italic text-blue-200">
                                {problem?.revisionCard?.interval != null
                                  ? `IN ${problem.revisionCard.interval} DAY${problem.revisionCard.interval === 1 ? "" : "S"}`
                                  : "NOT SCHEDULED YET"}
                             </span>
                          </div>
                          <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                       </div>
                    </motion.div>
                  ) : /* DONE but JSON parse failed */
                  aiNotes?.status === "DONE" && !aiContent ? (
                    <motion.div
                      key="parse-error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-8 text-center space-y-4"
                    >
                      <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto opacity-60" />
                      <p className="text-sm text-muted-foreground italic">
                        Notes format invalid. Regenerating…
                      </p>
                      <Button
                        onClick={() => regenerateMutation.mutate()}
                        disabled={regenerateMutation.isPending}
                        className="w-full rounded-xl"
                      >
                        REGENERATE INSIGHTS
                      </Button>
                    </motion.div>
                  ) : /* PENDING or PROCESSING — loading state */
                  aiNotes?.status === "PENDING" ||
                    aiNotes?.status === "PROCESSING" ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6 py-8"
                    >
                       <div className="flex flex-col items-center gap-4 text-center">
                          <Zap className="h-10 w-10 text-primary animate-pulse" />
                          <div className="space-y-1">
                             <h4 className="font-bold text-lg italic uppercase tracking-tighter">GEMINI IS ANALYZING…</h4>
                             <p className="text-xs text-muted-foreground max-w-[220px]">
                                Generating brute-force, better &amp; optimal comparisons
                                with complexity analysis.
                             </p>
                          </div>
                       </div>
                       <Progress value={60} className="h-1.5 bg-primary/10 animate-pulse" />
                    </motion.div>
                  ) : /* FAILED state */
                  aiNotes?.status === "FAILED" ? (
                    <motion.div
                      key="failed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-8 text-center space-y-4"
                    >
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto opacity-70" />
                      <p className="text-sm text-red-400 italic font-medium">
                        Generation failed.
                      </p>
                      {aiNotes.errorMessage && (
                        <p className="text-xs text-muted-foreground">
                          {aiNotes.errorMessage}
                        </p>
                      )}
                      <Button
                        onClick={() => regenerateMutation.mutate()}
                        disabled={regenerateMutation.isPending}
                        variant="destructive"
                        className="w-full rounded-xl"
                      >
                        RETRY
                      </Button>
                    </motion.div>
                  ) : (
                    /* No notes yet — first-time CTA */
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-8 text-center space-y-4"
                    >
                      <Brain className="h-10 w-10 text-primary opacity-30 mx-auto" />
                      <p className="text-sm text-muted-foreground italic">
                        No analysis generated yet for this problem.
                      </p>
                      <Button
                        onClick={() => regenerateMutation.mutate()}
                        disabled={regenerateMutation.isPending}
                        className="w-full rounded-xl"
                      >
                        {regenerateMutation.isPending
                          ? "Queuing…"
                          : "GENERATE INSIGHTS"}
                      </Button>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>
         </div>
      </main>
    </div>
  );
}
