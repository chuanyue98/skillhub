import { Suspense } from "react";
import { loadSkills } from "@/lib/skills";
import SearchPage from "@/components/SearchPage";

export const dynamic = "force-static";

export default function Home() {
  const skills = loadSkills();
  return (
    <main>
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
            <div className="h-10 w-56 animate-pulse rounded-lg bg-hairline/70" />
            <div className="h-40 animate-pulse rounded-xl bg-hairline/70" />
            <div className="h-12 animate-pulse rounded-xl bg-hairline/70" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-xl bg-hairline/70"
                />
              ))}
            </div>
          </div>
        }
      >
        <SearchPage skills={skills} />
      </Suspense>
    </main>
  );
}
