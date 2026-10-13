import PublicHeader from "@/components/PublicHeader";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
