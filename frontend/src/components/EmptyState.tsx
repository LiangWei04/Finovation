import { FileQuestion } from "lucide-react";

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="glass-panel flex min-h-40 flex-col items-center justify-center rounded-xl p-6 text-center">
      <FileQuestion className="mb-3 h-8 w-8 text-slate-400" />
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-xl text-sm text-slate-400">{message}</p>
    </div>
  );
}
