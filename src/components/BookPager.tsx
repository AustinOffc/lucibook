"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Daftar nomor halaman dengan elipsis, mis. 1 … 4 [5] 6 … 20 */
function buildPages(current: number, total: number): (number | "gap-l" | "gap-r")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const out: (number | "gap-l" | "gap-r")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push(i === 1 ? "gap-l" : "gap-r");
    out.push(n);
  });
  return out;
}

export default function BookPager({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const items = buildPages(current, total);
  const base =
    "grid h-9 min-w-9 shrink-0 place-items-center rounded-xl px-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pinksoft-400";

  return (
    <nav aria-label="Navigasi halaman buku" className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(current - 1)}
        disabled={current <= 1}
        className={cn(base, "border border-pinksoft-200 bg-white text-pinksoft-800 hover:bg-pinksoft-50 disabled:cursor-not-allowed disabled:opacity-40")}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1.5 overflow-x-auto">
        {items.map((it, i) =>
          typeof it === "number" ? (
            <button
              key={it}
              type="button"
              onClick={() => onChange(it)}
              aria-current={it === current ? "page" : undefined}
              aria-label={`Halaman ${it}`}
              className={cn(
                base,
                it === current
                  ? "bg-pinksoft-600 text-white shadow-sm"
                  : "border border-pinksoft-200 bg-white text-pinksoft-800 hover:bg-pinksoft-50"
              )}
            >
              {it}
            </button>
          ) : (
            <span key={`${it}-${i}`} className="px-0.5 text-gray-400" aria-hidden>
              …
            </span>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(current + 1)}
        disabled={current >= total}
        className={cn(base, "gap-1 bg-pinksoft-600 px-3 text-white hover:bg-pinksoft-700 disabled:cursor-not-allowed disabled:opacity-40")}
        aria-label="Halaman berikutnya"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
