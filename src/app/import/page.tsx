"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Import, Search, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

/**
 * Import Logic: Handles bulk import job trigger.
 * Requests a user's session cookie to perform server-side extraction.
 */
export default function ImportPage() {
  const [cookie, setCookie] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const { mutate: startImport, isPending } = useMutation({
    mutationFn: async (platform: string) => {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, sessionCookie: cookie })
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "IMPORT STARTED (BULLMQ QUEUED)",
        description: "Background worker has started capturing your submissions...",
      });
      router.push("/dashboard");
    },
    onError: () => {
       toast({
         title: "IMPORT FAILED",
         description: "Please check your session cookie and try again.",
         variant: "destructive"
       });
    }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 py-16">
      <div className="space-y-4">
        <h1 className="text-5xl font-black italic tracking-tighter">BULK SYNC DATA</h1>
        <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-2xl">
           Import your entire solve history from LeetCode. We'll capture every accepted submission 
           and generate AI-powered insights for each automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-card border-2 border-primary/20 rounded-3xl p-8 space-y-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-primary/20 transition-all" />
           
           <div className="h-14 w-14 bg-yellow-400/10 rounded-2xl flex items-center justify-center">
              <span className="text-yellow-400 font-black italic text-2xl tracking-tighter decoration-primary underline">LC</span>
           </div>

           <div className="space-y-4">
              <h3 className="text-2xl font-black italic tracking-tight">LEETCODE SYNC</h3>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SESSION COOKIE</label>
                 <textarea 
                   value={cookie}
                   onChange={(e) => setCookie(e.target.value)}
                   placeholder="Paste 'LEETCODE_SESSION' cookie here..."
                   className="w-full bg-white/5 border border-white/10 rounded-xl p-4 min-h-[120px] text-sm font-mono focus:ring-1 focus:ring-primary outline-none"
                 />
              </div>
           </div>

           <Button 
             variant="premium" 
             size="lg" 
             className="w-full h-14 rounded-2xl font-black italic text-xl shadow-2xl hover:scale-[1.02] transition-all"
             onClick={() => startImport("LEETCODE")}
             disabled={isPending || !cookie}
           >
              {isPending ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Import className="mr-2 h-5 w-5" />}
              {isPending ? "Starting Import..." : "INITIATE BULK SYNC"}
           </Button>

           <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-white/5 p-3 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-green-500" /> End-to-end encrypted capture
           </div>
        </div>

        <div className="space-y-8 flex flex-col justify-center">
           <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                 <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                 <h4 className="font-bold underline decoration-primary underline-offset-4 tracking-tighter italic uppercase text-sm">How to get cookie?</h4>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                    Log in to LeetCode, open DevTools, go to Application &gt; Cookies, find <code>LEETCODE_SESSION</code> and copy the value.

                 </p>
              </div>
           </div>
           
           <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                 <Search className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                 <h4 className="font-bold underline decoration-primary underline-offset-4 tracking-tighter italic uppercase text-sm">Automated Workers</h4>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                    Once initiated, our <span className="text-white font-bold">BullMQ Background Worker</span> handles the rest while you sleep.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
