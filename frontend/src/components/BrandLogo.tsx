import { Radio } from "lucide-react";

export function BrandLogo() {
  return (
    <a href="/" className="flex min-w-0 items-center gap-1.5" aria-label="ESG Momentum Radar home">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-broadcast-red text-white">
        <Radio className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="hidden text-lg font-bold leading-5 text-broadcast-text sm:block">ESG Radar</span>
    </a>
  );
}
