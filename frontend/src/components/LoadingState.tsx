import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight px-4">
      <div className="glass-panel flex items-center gap-3 rounded-xl px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-teal" />
        <span>Loading ESG evidence data...</span>
      </div>
    </div>
  );
}
