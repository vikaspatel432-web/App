import Link from "next/link";
import { branding } from "@/lib/branding";
import { logout } from "@/app/actions/auth";

type TopNavProps = {
  userName: string;
  isAdmin: boolean;
};

export function TopNav({ userName, isAdmin }: TopNavProps) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
      <Link href="/" className="flex items-center gap-2">
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt={branding.companyName} className="h-7" />
        ) : (
          <span className="font-semibold text-white">{branding.companyName}</span>
        )}
        <span className="text-sm text-neutral-500">{branding.appName}</span>
      </Link>
      <div className="flex items-center gap-4 text-sm text-neutral-300">
        {isAdmin && (
          <Link href="/admin" className="hover:text-white">
            Admin
          </Link>
        )}
        <span>{userName}</span>
        <form action={logout}>
          <button type="submit" className="text-neutral-400 hover:text-white">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
