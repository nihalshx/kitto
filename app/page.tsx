export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Kitto</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Codifykit&apos;s AI brand buddy. The chat widget lands here in build step 4; the API is live at{" "}
        <code className="rounded bg-black/5 px-1.5 py-0.5 text-[0.9em] dark:bg-white/10">/api/chat</code>.
      </p>
    </main>
  );
}
