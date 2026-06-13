import { chips } from "../data/navigation";

export function ChipBar() {
  return (
    <div className="sticky top-14 z-20 border-b border-broadcast-border bg-white">
      <div className="flex gap-3 overflow-x-auto px-4 py-3 lg:px-6">
        {chips.map((chip, index) => (
          <button key={chip} type="button" className={`rb-chip ${index === 0 ? "rb-chip-active" : ""}`}>
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
