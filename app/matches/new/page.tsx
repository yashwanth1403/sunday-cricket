import { MatchSetupForm } from "@/components/MatchSetupForm";

export default function NewMatchPage() {
  return (
    <div className="min-h-screen bg-emerald-950/95 py-6 text-zinc-950">
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4">
        <header>
          <h1 className="text-xl font-semibold text-emerald-50">New match</h1>
          <p className="text-sm text-emerald-200">
            Set up match details. You&apos;ll pick players and teams on the next step.
          </p>
        </header>
        <MatchSetupForm />
      </main>
    </div>
  );
}


