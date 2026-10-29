import OwnerShell from "@/components/owner/OwnerShell";

export const metadata = { title: "Panel Owner" };

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>;
}
