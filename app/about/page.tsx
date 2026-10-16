import SiteHeader from "@/components/site/SiteHeader";

export default function About() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-28">
        <h1 className="text-4xl font-semibold tracking-tight">About Codifykit</h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Codifykit started as a learn-to-code platform and grew into a digital growth and creative studio: websites,
          custom systems, social media, marketing and brand identity, tied together by strategy.
        </p>
      </section>
    </main>
  );
}
