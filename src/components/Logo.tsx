import { BookOpen } from "lucide-react";

export default function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12 rounded-2xl" : "h-9 w-9 rounded-xl";
  const icon = size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid place-items-center bg-coksu-500 text-white shadow-sm ${box}`}>
        <BookOpen className={icon} />
      </span>
      <span className={`font-bold tracking-tight text-coksu-900 ${size === "lg" ? "text-2xl" : "text-lg"}`}>Lucibook</span>
    </span>
  );
}
