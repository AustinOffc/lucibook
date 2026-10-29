import { ChevronLeft, ChevronRight, Crown, Lock } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pinksoft-100 text-pinksoft-700">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold leading-tight text-gray-900">
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

export function RoleBadge({ role }: { role: "USER" | "OWNER" }) {
  return role === "OWNER" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
      <Crown className="h-3 w-3" /> Owner
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">User</span>
  );
}

export function StatusBadge({ suspended }: { suspended: boolean }) {
  return suspended ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
      <Lock className="h-3 w-3" /> Ditangguhkan
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Aktif</span>
  );
}

export function Pill({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "pink" | "red" | "green" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "gray" && "bg-gray-100 text-gray-600",
        tone === "pink" && "bg-pinksoft-100 text-pinksoft-800",
        tone === "red" && "bg-red-100 text-red-700",
        tone === "green" && "bg-emerald-100 text-emerald-700"
      )}
    >
      {children}
    </span>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-500">
      <span>{total.toLocaleString("id-ID")} data</span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-outline px-3 py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button type="button" className="btn-outline px-3 py-1.5" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Berikutnya">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>;
}
