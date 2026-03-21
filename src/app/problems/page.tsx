"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, ExternalLink, Calendar, Code2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * Problems List: Shows all captured/imported problems for the user.
 */
export default function ProblemsPage() {
  const { data: problems, isLoading } = useQuery({
    queryKey: ["problems-list"],
    queryFn: async () => {
      const res = await fetch("/api/problems");
      const data = await res.json();
      return data.data.problems;
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter">MY PROBLEMS</h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">
            Total Solved: <span className="text-white">{problems?.length ?? 0}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <input 
              placeholder="Search by title or tag..." 
              className="bg-white/5 border border-white/10 rounded-xl h-10 pl-10 pr-4 text-sm w-64 focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-xl"><Filter className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-black italic tracking-tighter">LOADING PROBLEMS...</div>
        ) : problems?.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl gap-4">
             <Code2 className="h-12 w-12 text-muted-foreground opacity-20" />
             <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm text-center">No problems found.<br/>Import them via extension or bulk import.</p>
             <Button variant="premium" asChild><Link href="/import/leetcode">Import Now</Link></Button>
          </div>
        ) : (
          problems?.map((problem: any, index: number) => (

            <motion.div
              key={problem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border rounded-2xl p-5 hover:border-primary/50 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black italic shadow-lg outline outline-1 outline-white/5
                  ${problem.difficulty === 'EASY' ? 'bg-green-500/10 text-green-500' : 
                    problem.difficulty === 'MEDIUM' ? 'bg-orange-500/10 text-orange-500' : 
                    'bg-red-500/10 text-red-500'}
                `}>
                  {problem.difficulty[0]}
                </div>
                <div className="space-y-1">
                  <Link href={`/problems/${problem.id}`} className="text-xl font-bold tracking-tight hover:text-primary transition-colors flex items-center gap-2">
                    {problem.title}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-white/5 text-[10px] font-black uppercase tracking-widest">{problem.platform}</Badge>
                    {problem.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors">#{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12 text-muted-foreground whitespace-nowrap">
                <div className="flex flex-col items-end gap-1">
                   <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                      <Calendar className="h-3 w-3" /> Latest Solve
                   </div>
                   <span className="text-white text-sm font-black italic">{new Date(problem.createdAt).toLocaleDateString()}</span>
                </div>
                <Button variant="premium" size="sm" className="rounded-lg h-9 font-black italic" asChild>
                   <Link href={`/problems/${problem.id}`}>VIEW CODE</Link>
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
