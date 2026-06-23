import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}
