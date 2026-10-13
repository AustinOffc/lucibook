import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-coksu-600", className)} aria-label="Memuat" />;
}

export function FullScreenSpinner() {
  return (
    <div className="grid h-dvh place-items-center bg-slate-50">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function BlockSpinner() {
  return (
    <div className="flex justify-center py-16">
      <Spinner className="h-7 w-7" />
    </div>
  );
}
