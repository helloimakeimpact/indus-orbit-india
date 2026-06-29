import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Layers3,
  PlayCircle,
  Route as RouteIcon,
  Target,
} from "lucide-react";
import { getCourseBySlug } from "@/server/education.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/education/$courseSlug/")({
  component: CoursePage,
});

function CoursePage() {
  const { courseSlug } = useParams({ from: "/app/education/$courseSlug/" });
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await getCourseBySlug(courseSlug);
        setData(d);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseSlug]);

  const modules = useMemo(
    () =>
      (data?.modules ?? []).map((module: any) => ({
        ...module,
        lessons: (module.lessons ?? []).filter((lesson: any) => lesson.status === "published"),
      })),
    [data],
  );
  const allLessons = useMemo(() => modules.flatMap((module: any) => module.lessons), [modules]);
  const done = allLessons.filter((lesson: any) => data?.progress?.[lesson.id]).length;
  const pct = allLessons.length ? Math.round((done / allLessons.length) * 100) : 0;
  const totalMinutes = allLessons.reduce(
    (sum: number, lesson: any) => sum + (lesson.duration_mins ?? 0),
    0,
  );
  const nextLesson =
    allLessons.find((lesson: any) => !data?.progress?.[lesson.id]) ?? allLessons[0];

  function openLesson(lessonSlug: string) {
    navigate({
      to: "/app/education/$courseSlug/$lessonSlug",
      params: { courseSlug, lessonSlug },
    });
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading course...</div>;
  if (!data) return <div className="p-6">Course not found.</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-4 md:p-5">
      <Link
        to="/app/education"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-[var(--indigo-night)]"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Academy
      </Link>

      <section className="app-glass overflow-hidden rounded-2xl p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--saffron)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--indigo-night)]">
              <RouteIcon className="h-3.5 w-3.5" />
              Course path
            </span>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-[var(--indigo-night)] md:text-3xl">
              {data.course.title}
            </h1>
            {data.course.summary && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {data.course.summary}
              </p>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <CourseStat icon={<Target />} label="Progress" value={`${pct}%`} />
              <CourseStat
                icon={<Layers3 />}
                label="Lessons"
                value={`${done}/${allLessons.length}`}
              />
              <CourseStat icon={<Clock />} label="Time" value={`${totalMinutes}m`} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[var(--indigo-night)]">Course progress</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <Progress value={pct} className="mt-3 h-2" />
            <p className="mt-3 text-sm text-muted-foreground">
              {nextLesson ? `Next: ${nextLesson.title}` : "No published lessons are available yet."}
            </p>
            {nextLesson && (
              <Button
                className="mt-4 w-full rounded-full"
                onClick={() => openLesson(nextLesson.slug)}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="space-y-3">
          {modules.length === 0 && (
            <div className="app-glass rounded-2xl p-6 text-sm text-muted-foreground">
              No modules yet.
            </div>
          )}
          {modules.map((module: any, moduleIndex: number) => (
            <section key={module.id} className="app-glass rounded-2xl p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Module {moduleIndex + 1}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[var(--indigo-night)]">
                    {module.title}
                  </h2>
                  {module.summary && (
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{module.summary}</p>
                  )}
                </div>
                <span className="w-fit rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {module.lessons.length} lessons
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {module.lessons.length === 0 && (
                  <p className="rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
                    No lessons yet.
                  </p>
                )}
                {module.lessons.map((lesson: any, lessonIndex: number) => {
                  const completed = !!data.progress[lesson.id];
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => openLesson(lesson.slug)}
                      className="group flex w-full flex-col gap-3 rounded-2xl border border-border bg-card/70 p-3 text-left transition hover:border-[var(--saffron)]/70 hover:bg-card sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                            completed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-[var(--saffron)]/15 text-[var(--indigo-night)]",
                          )}
                        >
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {lessonIndex + 1}. {lesson.title}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lesson.duration_mins ?? "--"}m
                            </span>
                            {lesson.video_url && (
                              <span className="inline-flex items-center gap-1">
                                <PlayCircle className="h-3 w-3" />
                                Video reference
                              </span>
                            )}
                          </span>
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 pl-12 text-xs font-semibold text-muted-foreground group-hover:text-[var(--indigo-night)] sm:pl-0">
                        Open lesson <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </main>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="app-glass rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Course map
            </p>
            <div className="mt-3 space-y-2">
              {modules.map((module: any, index: number) => {
                const moduleDone = module.lessons.filter(
                  (lesson: any) => data.progress[lesson.id],
                ).length;
                const modulePct = module.lessons.length
                  ? Math.round((moduleDone / module.lessons.length) * 100)
                  : 0;
                return (
                  <div key={module.id} className="rounded-2xl bg-muted/45 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-semibold">
                        {index + 1}. {module.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{modulePct}%</span>
                    </div>
                    <Progress value={modulePct} className="mt-2 h-1.5" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--saffron)]/35 bg-[var(--saffron)]/15 p-4">
            <h2 className="text-sm font-semibold text-[var(--indigo-night)]">
              How to use this path
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">
              <li>Open the next lesson and use the linked video reference.</li>
              <li>Mark lessons complete as you finish each build step.</li>
              <li>Use the quiz to check whether the workflow is clear.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CourseStat({ icon, label, value }: { icon: ReactElement; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--saffron)]/15 text-[var(--indigo-night)] [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <p className="mt-2 text-xl font-semibold text-[var(--indigo-night)]">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
