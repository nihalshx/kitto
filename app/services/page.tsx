import SiteHeader from "@/components/site/SiteHeader";

const SERVICES = [
  ["Websites", "Fast, clear sites that turn visitors into customers."],
  ["CRM & ERP", "Custom systems that fit how your team actually works."],
  ["Social media", "Content plans, posts and reels that sound like you."],
  ["Digital marketing", "Campaigns tied to real goals, not vanity numbers."],
  ["Brand identity", "Names, logos, colours and voice that hang together."],
];

export default function Services() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader />
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-28">
        <h1 className="text-4xl font-semibold tracking-tight">Services</h1>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {SERVICES.map(([title, body]) => (
            <li key={title} className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">{body}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
