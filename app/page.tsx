import SiteHeader from "@/components/site/SiteHeader";

// Demo host page for the Kitto widget. On the real site, the widget mounts in the root layout of codifykit's pages.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 pt-10 pb-28">
        <p className="text-sm font-semibold tracking-wide text-violet-700 uppercase dark:text-violet-300">
          Tech and creative under one roof
        </p>
        <h1 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Websites, systems and content that sound like you.
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Not sure what your brand should feel like? Ask Kitto, our cat-shaped brand buddy, in the corner. She gives
          ideas, talks through brand problems and roasts bios (lovingly).
        </p>
      </section>
    </main>
  );
}
