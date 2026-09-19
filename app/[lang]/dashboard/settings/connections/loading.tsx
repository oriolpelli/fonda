import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-48" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[16px] bg-card p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ))}
    </div>
  );
}
