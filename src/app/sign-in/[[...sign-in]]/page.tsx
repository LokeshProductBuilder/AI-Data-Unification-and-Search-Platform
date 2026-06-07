import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="relative z-10">
        <SignIn />
      </div>
    </main>
  );
}
