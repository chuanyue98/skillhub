import { Suspense } from "react";
import { loadSkills } from "@/lib/skills";
import BrowsePage from "@/components/BrowsePage";

export default function BrowseRoute() {
  const skills = loadSkills();
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowsePage skills={skills} />
    </Suspense>
  );
}

function BrowseSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-hairline" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-hairline" />
        ))}
      </div>
    </div>
  );
}
