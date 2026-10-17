import { Tag } from "lucide-react";

export default function LabelChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pinksoft-100 px-2.5 py-0.5 text-xs font-medium text-pinksoft-800">
      <Tag className="h-3 w-3" />
      {name}
    </span>
  );
}
