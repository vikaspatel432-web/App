import { branding } from "@/lib/branding";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.companyName} className="mx-auto h-10" />
          ) : (
            <h1 className="text-xl font-semibold text-white">{branding.companyName}</h1>
          )}
          <p className="mt-2 text-sm text-neutral-400">{branding.appName}</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
