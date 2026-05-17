import { Scene } from "../scene";

export default function SimPage() {
  return (
    <main className="flex h-screen flex-col bg-sky-100 text-slate-900">
      <header className="shrink-0 bg-white/80 shadow-sm">
        <h1 className="p-4 text-xl font-bold">外骨骼仿真 · Phase 2</h1>
      </header>
      <section className="min-h-0 flex-1 [&_canvas]:!h-full [&_canvas]:!w-full">
        <Scene />
      </section>
    </main>
  );
}
