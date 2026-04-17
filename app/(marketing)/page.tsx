import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
        <span className="inline-block h-3 w-3 rounded-full bg-brand-600" />
        Clubbify
      </div>
      <h1 className="mt-10 text-4xl font-bold tracking-tight sm:text-5xl">
        Retain students by connecting them to clubs they love.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-600">
        Clubbify is a student retention management platform for schools. Students
        discover and join clubs, officers run them, and advisors get the
        engagement signals they need to catch at-risk students early.
      </p>
      <div className="mt-10 flex items-center gap-4">
        <Link href="/login" className="btn-primary">
          Sign in
        </Link>
        <Link href="/clubs" className="btn-secondary">
          Browse clubs
        </Link>
      </div>
    </main>
  );
}
