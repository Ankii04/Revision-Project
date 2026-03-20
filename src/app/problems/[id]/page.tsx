"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Brain, Code, ExternalLink, Lightbulb, TrendingUp, Zap, RotateCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";

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
      return (await res.json()).data.problem;
    },
  });

  // 2. Mutation for regenerating AI notes
  const regenerateMutation = useMutation({
    mutationFn: async () => {
       const res = await fetch(`/api/ai-notes/${id}/generate`, { method: "POST" });
       return await res.json();
    },
    onSuccess: () => {
       // Poll for updates if the generation has started
       refetch();
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 animate-pulse">
         <div className="h-10 w-96 bg-muted rounded-xl" />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
            <div className="bg-muted rounded-2xl" />
            <div className="bg-muted rounded-2xl" />
         </div>
      </div>
    );
  }

  const problem = data;
  const aiNotes = problem?.aiNotes;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="border-b bg-card/10 backdrop-blur-md sticky top-0 z-10 px-6 h-16 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground font-bold text-xs uppercase hover:text-foreground">BACK</Link>
            <div className="h-4 w-[1px] bg-border" />
            <h1 className="font-bold text-lg max-w-[400px] truncate">{problem?.title}</h1>
         </div>
         <div className="flex gap-3">
             <Button variant="outline" size="sm" asChild>
                <a href={problem?.platformUrl} target="_blank" rel="noreferrer">
                   VIEW ON {problem?.platform} <ExternalLink className="ml-2 h-3 w-3" />
                </a>
             </Button>
         </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* Left Column: Solution Viewer */}
         <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold tracking-tight italic uppercase tracking-tighter">MY SOLUTION</h3>
                  <Badge variant="outline" className="text-[10px] ml-2 font-mono uppercase tracking-widest">{problem?.language}</Badge>
               </div>
               <span className="text-xs text-muted-foreground font-bold">SOLVED {formatRelativeTime(problem?.submittedAt)}</span>
            </div>
            
            <div className="bg-[#0b0e14] rounded-2xl border p-8 font-mono text-sm text-blue-300 leading-relaxed shadow-xl overflow-hidden group">
               <pre className="whitespace-pre-wrap max-h-[800px] overflow-y-auto pr-4 scrollbar-thin">
                  {problem?.solutionCode}
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
                     >
                        <RotateCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                     </Button>
                  )}
               </div>

               <AnimatePresence mode="wait">
                  {aiNotes?.status === "DONE" ? (
                    <motion.div 
                      key="done"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                       <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 relative">
                          <Lightbulb className="absolute -top-3 -right-3 h-10 w-10 text-primary opacity-20" />
                          <p className="text-blue-100 font-medium leading-relaxed italic">
                             "{aiNotes.content.keyInsight}"
                          </p>
                       </div>

                       <div className="space-y-6">
                          {aiNotes.content.approaches.map((approach: any, i: number) => (
                            <div key={approach.name} className="space-y-2 border-l-2 border-primary/30 pl-4 py-1">
                               <div className="flex items-center justify-between">
                                  <span className="text-xs font-black italic text-primary uppercase tracking-widest">{approach.name}</span>
                                  <div className="flex gap-2">
                                     <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-primary/20 py-0">{approach.timeComplexity}</Badge>
                                     <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-primary/20 py-0">{approach.spaceComplexity}</Badge>
                                  </div>
                               </div>
                               <p className="text-sm text-muted-foreground leading-relaxed">{approach.description}</p>
                            </div>
                          ))}
                       </div>

                       <div className="pt-4 border-t border-primary/10 flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">NEXT REVISION</span>
                             <span className="text-sm font-bold tracking-tight italic text-blue-200">IN {problem.revisionCard.interval} DAYS</span>
                          </div>
                          <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                       </div>
                    </motion.div>
                  ) : aiNotes?.status === "PENDING" || aiNotes?.status === "PROCESSING" ? (
                    <div className="space-y-6 py-8">
                       <div className="flex flex-col items-center gap-4 text-center">
                          <Zap className="h-10 w-10 text-primary animate-pulse" />
                          <div className="space-y-1">
                             <h4 className="font-bold text-lg italic tracking-tight uppercase tracking-tighter">CLAUDE IS ANALYZING...</h4>
                             <p className="text-xs text-muted-foreground max-w-[200px]">Generating brute-force vs optimal comparisons and key insights.</p>
                          </div>
                       </div>
                       <Progress value={45} className="h-1 bg-primary/10 animate-pulse" />
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-4">
                       <p className="text-sm text-muted-foreground italic">No analysis generated yet for this problem.</p>
                       <Button 
                          onClick={() => regenerateMutation.mutate()} 
                          disabled={regenerateMutation.isPending}
                          className="w-full rounded-xl"
                       >
                          GENERATE INSIGHTS
                       </Button>
                    </div>
                  )}
               </AnimatePresence>
            </div>
         </div>
      </main>
    </div>
  );
}
