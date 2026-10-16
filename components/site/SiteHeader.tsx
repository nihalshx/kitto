import Link from "next/link";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
      <Link href="/" className="text-lg font-bold tracking-tight">
        Codifykit
      </Link>
      <nav className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-400">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="hover:text-zinc-950 dark:hover:text-white">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
