import { notFound } from "next/navigation";
import { ChartColumn, CreditCard, Settings } from "lucide-react";
import { Card } from "@/components/ui";

const sections = {
  analytics: { title: "Analytics", icon: ChartColumn, text: "Deep-dive scan analytics across all your AR models." },
  billing: { title: "Billing", icon: CreditCard, text: "Manage your plan, invoices and payment methods." },
  settings: { title: "Settings", icon: Settings, text: "Workspace, team and branding preferences." },
};

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const s = sections[section as keyof typeof sections];
  if (!s) notFound();
  const Icon = s.icon;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
      <Card className="mt-6 flex flex-col items-center px-6 py-20 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Icon className="size-7" aria-hidden />
        </div>
        <p className="mt-4 font-medium text-slate-900">Coming soon</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{s.text}</p>
      </Card>
    </main>
  );
}
