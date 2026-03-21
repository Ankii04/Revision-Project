import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <SignIn 
        appearance={{
          variables: {
            colorPrimary: "#3b82f6",
          },
          elements: {
            card: "bg-slate-900 border border-white/10 shadow-2xl",
            headerTitle: "text-white italic font-black text-2xl tracking-tighter",
            headerSubtitle: "text-slate-400",
            socialButtonsBlockButton: "border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold",
            formButtonPrimary: "bg-primary hover:bg-primary/90 text-white italic font-bold",
            footerActionText: "text-slate-400 font-medium",
            footerActionLink: "text-primary hover:text-primary/90 font-black italic",
            formFieldLabel: "text-slate-300 font-black uppercase text-[10px] tracking-widest",
            formFieldInput: "bg-white/5 border-white/10 text-white focus:ring-primary focus:border-primary",
          }
        }}
      />
    </div>
  );
}
