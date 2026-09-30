"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Lock, Mail, MailCheck, User } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

type View = "login" | "register" | "forgot";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M16.37 12.64c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.15.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27z" />
    </svg>
  );
}

function OAuthButtons({ onSelect, disabled }: { onSelect: () => void; disabled: boolean }) {
  return (
    <>
      <div className="relative my-6 flex items-center" role="separator">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="px-3 text-xs font-medium uppercase tracking-wider text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid gap-3">
        <Button variant="secondary" onClick={onSelect} disabled={disabled}>
          <GoogleIcon /> Continue with Google
        </Button>
        <Button variant="secondary" onClick={onSelect} disabled={disabled}>
          <AppleIcon /> Continue with Apple
        </Button>
      </div>
    </>
  );
}

function PasswordInput({ id, autoComplete }: { id: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      id={id}
      name="password"
      label="Password"
      type={visible ? "text" : "password"}
      icon={Lock}
      placeholder="••••••••"
      autoComplete={autoComplete}
      minLength={8}
      required
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}

export function AuthFlow() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  const goToDashboard = () => {
    setLoading(true);
    setTimeout(() => router.push("/dashboard"), 700);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (view === "forgot") {
      const email = String(new FormData(e.currentTarget).get("email"));
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setResetSentTo(email);
      }, 700);
      return;
    }
    goToDashboard();
  };

  const switchView = (next: View) => {
    setView(next);
    setResetSentTo(null);
  };

  const heading = {
    login: { title: "Welcome back", subtitle: "Sign in to manage your 3D & AR models." },
    register: { title: "Create your account", subtitle: "Turn any product into an AR experience in minutes." },
    forgot: { title: "Reset your password", subtitle: "Enter your email and we'll send you a reset link." },
  }[view];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/60 to-violet-100/60 px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-indigo-300/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-20 size-[28rem] rounded-full bg-violet-300/25 blur-3xl" />

      <Card className="relative w-full max-w-md p-8 shadow-xl shadow-indigo-900/5 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">{heading.title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{heading.subtitle}</p>
        </div>

        {view !== "forgot" && (
          <div role="tablist" aria-label="Authentication" className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {(["login", "register"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => switchView(v)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {v === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        <div key={view} className="animate-fade-up">
          {view === "forgot" && resetSentTo ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center" role="status">
              <MailCheck className="mx-auto size-8 text-emerald-600" aria-hidden />
              <p className="mt-3 text-sm font-medium text-emerald-900">Check your inbox</p>
              <p className="mt-1 text-sm text-emerald-700">
                We sent a reset link to <span className="font-medium">{resetSentTo}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {view === "register" && (
                <Input id="name" name="name" label="Full name" icon={User} placeholder="Jane Cooper" autoComplete="name" required />
              )}
              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                icon={Mail}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
              {view !== "forgot" && (
                <div className="space-y-2">
                  <PasswordInput id="password" autoComplete={view === "login" ? "current-password" : "new-password"} />
                  {view === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => switchView("forgot")}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline-none focus-visible:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                {{ login: "Sign In", register: "Create Account", forgot: "Send Reset Link" }[view]}
              </Button>
            </form>
          )}

          {view !== "forgot" && <OAuthButtons onSelect={goToDashboard} disabled={loading} />}
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          {view === "login" && (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => switchView("register")} className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign up
              </button>
            </>
          )}
          {view === "register" && (
            <>
              Already have an account?{" "}
              <button onClick={() => switchView("login")} className="font-medium text-indigo-600 hover:text-indigo-500">
                Log in
              </button>
            </>
          )}
          {view === "forgot" && (
            <button
              onClick={() => switchView("login")}
              className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" aria-hidden /> Back to Login
            </button>
          )}
        </div>
      </Card>
    </main>
  );
}
