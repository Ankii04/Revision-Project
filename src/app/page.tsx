import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Brain, Flame, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * Landing Page: Modern, high-conversion landing page for the platform.
 * Redirects to /dashboard if the user is already authenticated.
 */
export default async function LandingPage() {
  const { userId } = await auth();

  // Redirect to dashboard if logged in
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-primary/30">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter italic">DSA REVISION</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest">Login</Link>
          <Button variant="premium" className="rounded-full px-6 h-10" asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
             <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Production Mode Active</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-5 duration-700">
            MASTER YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">CODING INTERVIEW</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Stop forgetting what you solved. Import your LeetCode solutions, get AI-powered insights, 
            and revise using the <span className="text-white font-bold italic">SM-2 Spaced Repetition</span> algorithm.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
             <Button variant="premium" size="lg" className="rounded-2xl h-14 px-10 text-xl font-black italic shadow-2xl hover:scale-105 transition-all" asChild>
                <Link href="/sign-up">START REVISING NOW <ArrowRight className="ml-2 h-5 w-5" /></Link>
             </Button>
             <Button variant="outline" size="lg" className="rounded-2xl h-14 px-10 border-white/10 hover:bg-white/5 text-lg font-bold">
                VIEW DEMO
             </Button>
          </div>

          <div className="flex items-center justify-center gap-12 pt-12 text-muted-foreground flex-wrap">
             <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                <ShieldCheck className="h-4 w-4 text-green-500" /> Auto-Capture
             </div>
             <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                <Zap className="h-4 w-4 text-yellow-500" /> AI Insights
             </div>
             <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                <Flame className="h-4 w-4 text-orange-500" /> Daily Streaks
             </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="bg-white/[0.02] border-y border-white/5 py-24">
           <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                 <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                    <Zap className="h-6 w-6 text-blue-500" />
                 </div>
                 <h3 className="text-xl font-bold italic tracking-tight uppercase tracking-tighter">Bulk Import</h3>
                 <p className="text-muted-foreground leading-relaxed">
                    Instantly sync your entire history from LeetCode and GFG with a single session cookie.
                 </p>
              </div>
              <div className="space-y-4">
                 <div className="h-12 w-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                    <Brain className="h-6 w-6 text-purple-500" />
                 </div>
                 <h3 className="text-xl font-bold italic tracking-tight uppercase tracking-tighter">AI Analysis</h3>
                 <p className="text-muted-foreground leading-relaxed">
                    Claude 3.5 Sonnet analyzes every solution to give you brute-force vs optimal trade-offs.
                 </p>
              </div>
              <div className="space-y-4">
                 <div className="h-12 w-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                    <Flame className="h-6 w-6 text-orange-500" />
                 </div>
                 <h3 className="text-xl font-bold italic tracking-tight uppercase tracking-tighter">Smart Flashcards</h3>
                 <p className="text-muted-foreground leading-relaxed">
                    The SM-2 algorithm schedules your reviews exactly when you're about to forget them.
                 </p>
              </div>
           </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 text-center text-muted-foreground text-xs font-bold tracking-[0.25em] uppercase border-t border-white/5">
         &copy; 2024 DSA Revision Platform — Built for Champions.
      </footer>
    </div>
  );
}
