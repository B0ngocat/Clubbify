import { signIn } from "@/lib/auth/authjs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const error = sp?.error;
  const callbackUrl = sp?.callbackUrl ?? "/clubs";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="card p-8">
        <div className="flex items-center gap-2 text-brand-600 font-bold text-xl mb-6">
          <span className="inline-block h-3 w-3 rounded-full bg-brand-600" />
          Clubbify
        </div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your school Google account to continue.
        </p>

        {error ? (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error === "AccessDenied"
              ? "Your email domain isn't on this school's allowlist. Contact your admin."
              : "Couldn't sign you in. Please try again."}
          </div>
        ) : null}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
          className="mt-6"
        >
          <button type="submit" className="btn-primary w-full">
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
