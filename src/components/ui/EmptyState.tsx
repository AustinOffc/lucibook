import { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-coksu-100 text-coksu-700">{icon}</div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {hint && <p className="mt-1 max-w-sm text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
