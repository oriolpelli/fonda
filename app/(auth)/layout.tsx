import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted px-4 py-12">
      <Wordmark />
      {children}
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Fonda. Hotel operations, on autopilot.
      </p>
    </div>
  );
}
