import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  Clock3,
  ExternalLink,
  FileDown,
  GraduationCap,
  Layers3,
  PlayCircle,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import {
  getCourseBySlug,
  getSignedEducationUrl,
  listPublishedCourses,
  listResources,
} from "@/server/education.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/education/")({
  component: EducationIndex,
});

const courseAccents = [
  "bg-[var(--saffron)]/15 text-[var(--indigo-night)]",
  "bg-emerald-100/80 text-emerald-900",
  "bg-sky-100/80 text-sky-950",
  "bg-rose-100/80 text-rose-950",
  "bg-violet-100/75 text-violet-950",
];

const progressAccents = [
  "bg-[var(--saffron)]",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-rose-400",
  "bg-violet-400",
];

const aiCompanyWatchlist = [
  {
    name: "OpenAI",
    focus: "frontier models, ChatGPT, agent tooling",
    about:
      "OpenAI is a research and product company building AI systems and developer tools used across consumer, enterprise, and builder workflows.",
    aboutUrl: "https://openai.com/about/",
    videoUrl: "https://www.youtube.com/results?search_query=OpenAI+official+AI+overview",
  },
  {
    name: "Anthropic",
    focus: "Claude, safety, constitutional AI",
    about:
      "Anthropic builds Claude and focuses heavily on reliable, steerable AI systems for work, coding, analysis, and enterprise use cases.",
    aboutUrl: "https://www.anthropic.com/company",
    videoUrl: "https://www.youtube.com/results?search_query=Anthropic+Claude+official+AI+overview",
  },
  {
    name: "Google DeepMind",
    focus: "Gemini, research, multimodal AI",
    about:
      "Google DeepMind combines long-running AI research with Google-scale products, from Gemini to science and reasoning systems.",
    aboutUrl: "https://deepmind.google/about/",
    videoUrl:
      "https://www.youtube.com/results?search_query=Google+DeepMind+Gemini+official+overview",
  },
  {
    name: "Microsoft AI",
    focus: "Copilot, enterprise AI, Azure",
    about:
      "Microsoft brings AI into productivity, developer, cloud, and enterprise workflows through Copilot, Azure AI, and partner models.",
    aboutUrl: "https://www.microsoft.com/en-us/ai",
    videoUrl: "https://www.youtube.com/results?search_query=Microsoft+AI+Copilot+official+overview",
  },
  {
    name: "Meta AI",
    focus: "Llama, open models, social AI",
    about:
      "Meta AI is important for builders because of Llama, open model releases, social product integrations, and applied AI research.",
    aboutUrl: "https://ai.meta.com/",
    videoUrl: "https://www.youtube.com/results?search_query=Meta+AI+Llama+official+overview",
  },
  {
    name: "NVIDIA",
    focus: "AI chips, CUDA, inference stack",
    about:
      "NVIDIA powers much of the AI infrastructure layer, from GPUs and CUDA to data-center systems, inference, robotics, and model serving.",
    aboutUrl: "https://www.nvidia.com/en-us/ai/",
    videoUrl: "https://www.youtube.com/results?search_query=NVIDIA+AI+official+overview",
  },
  {
    name: "Mistral AI",
    focus: "open-weight models, European AI",
    about:
      "Mistral AI builds efficient frontier and open-weight models, plus La Plateforme for developers who need flexible AI infrastructure.",
    aboutUrl: "https://mistral.ai/company",
    videoUrl: "https://www.youtube.com/results?search_query=Mistral+AI+official+overview",
  },
  {
    name: "xAI",
    focus: "Grok, real-time assistants",
    about:
      "xAI builds Grok and a rapidly evolving model/product stack around real-time reasoning, assistant interfaces, and social context.",
    aboutUrl: "https://x.ai/",
    videoUrl: "https://www.youtube.com/results?search_query=xAI+Grok+official+overview",
  },
  {
    name: "Perplexity",
    focus: "answer engine, search, research UX",
    about:
      "Perplexity is useful to study for AI-native search, citation-driven answers, research workflows, and fast consumer product loops.",
    aboutUrl: "https://www.perplexity.ai/",
    videoUrl: "https://www.youtube.com/results?search_query=Perplexity+AI+official+overview",
  },
  {
    name: "Cohere",
    focus: "enterprise LLMs, retrieval, security",
    about:
      "Cohere focuses on secure enterprise AI, retrieval, multilingual models, and production tools for organizations deploying LLMs.",
    aboutUrl: "https://cohere.com/about",
    videoUrl: "https://www.youtube.com/results?search_query=Cohere+AI+official+overview",
  },
];

function EducationIndex() {
  const [courses, setCourses] = useState<any[]>([]);
  const [courseDetails, setCourseDetails] = useState<Record<string, any>>({});
  const [resources, setResources] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [publishedCourses, publishedResources] = await Promise.all([
        listPublishedCourses(),
        listResources({ query: q }),
      ]);
      setCourses(publishedCourses);
      setResources(publishedResources);

      const details = await Promise.all(
        publishedCourses.map((course: any) => getCourseBySlug(course.slug).catch(() => null)),
      );
      setCourseDetails(
        Object.fromEntries(
          publishedCourses.map((course: any, index: number) => [course.slug, details[index]]),
        ),
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const courseSummaries = useMemo(
    () =>
      courses.map((course, index) => {
        const detail = courseDetails[course.slug];
        const lessons = (detail?.modules ?? []).flatMap((module: any) =>
          (module.lessons ?? []).filter((lesson: any) => lesson.status === "published"),
        );
        const completed = lessons.filter((lesson: any) => detail?.progress?.[lesson.id]).length;
        const minutes = lessons.reduce(
          (sum: number, lesson: any) => sum + (lesson.duration_mins ?? 0),
          0,
        );
        const nextLesson = lessons.find((lesson: any) => !detail?.progress?.[lesson.id]);

        return {
          course,
          index,
          lessons,
          completed,
          minutes,
          nextLesson,
          pct: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
        };
      }),
    [courses, courseDetails],
  );

  const totals = useMemo(() => {
    const totalLessons = courseSummaries.reduce((sum, item) => sum + item.lessons.length, 0);
    const completedLessons = courseSummaries.reduce((sum, item) => sum + item.completed, 0);
    const totalMinutes = courseSummaries.reduce((sum, item) => sum + item.minutes, 0);
    return {
      totalLessons,
      completedLessons,
      totalMinutes,
      pct: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    };
  }, [courseSummaries]);

  const activeCourse = courseSummaries.find((item) => item.nextLesson) ?? courseSummaries[0];
  const nextItems = courseSummaries.filter((item) => item.nextLesson).slice(0, 4);
  const recentItems = [...courses]
    .sort(
      (a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
    )
    .slice(0, 5);

  async function openFile(path: string) {
    try {
      const url = await getSignedEducationUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-4 md:p-5">
      <section className="app-glass overflow-hidden rounded-2xl p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--indigo-night)] text-[var(--parchment)]">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div>
                <p className="app-workspace-kicker">Academy</p>
                <h1 className="text-2xl font-semibold text-[var(--indigo-night)] md:text-3xl">
                  Builder learning hub
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              A focused workspace for AI app builders: courses, current references, resource
              material, and the next lesson to keep momentum moving.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard
                icon={<BookOpenCheck className="h-4 w-4" />}
                label="Lessons"
                value={`${totals.completedLessons}/${totals.totalLessons || 0}`}
                tone="bg-[var(--saffron)]/15 text-[var(--indigo-night)]"
              />
              <MetricCard
                icon={<Layers3 className="h-4 w-4" />}
                label="Courses"
                value={String(courses.length)}
                tone="bg-emerald-100 text-emerald-900"
              />
              <MetricCard
                icon={<Clock3 className="h-4 w-4" />}
                label="Study time"
                value={`${totals.totalMinutes || 0}m`}
                tone="bg-sky-100 text-sky-950"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  My progress
                </p>
                <p className="mt-2 text-3xl font-semibold text-[var(--indigo-night)]">
                  {totals.pct}%
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--saffron)]/20 text-[var(--indigo-night)]">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>
            <Progress value={totals.pct} className="mt-4 h-2" />
            {activeCourse?.course && (
              <Link
                to="/app/education/$courseSlug"
                params={{ courseSlug: activeCourse.course.slug }}
                className="mt-4 inline-flex w-full items-center justify-between rounded-full bg-[var(--indigo-night)] px-4 py-2 text-sm font-semibold text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
              >
                Continue learning
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <main className="min-w-0 space-y-4">
          <Tabs defaultValue="courses" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--indigo-night)]">Learning paths</h2>
                <p className="text-sm text-muted-foreground">
                  Pick a path, follow the lessons, then open the latest video references inside.
                </p>
              </div>
              <TabsList className="w-fit rounded-full">
                <TabsTrigger value="courses" className="rounded-full">
                  Courses
                </TabsTrigger>
                <TabsTrigger value="resources" className="rounded-full">
                  Resources
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="courses" className="mt-0">
              {loading ? (
                <div className="app-glass rounded-2xl p-6 text-sm text-muted-foreground">
                  Loading Academy...
                </div>
              ) : courseSummaries.length === 0 ? (
                <div className="app-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                  No courses published yet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {courseSummaries.map((item) => (
                    <Link
                      key={item.course.id}
                      to="/app/education/$courseSlug"
                      params={{ courseSlug: item.course.slug }}
                      className="group flex min-h-[13rem] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-[var(--saffron)]/60 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={cn(
                              "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                              courseAccents[item.index % courseAccents.length],
                            )}
                          >
                            <GraduationCap className="h-4 w-4" />
                          </span>
                          <Badge variant="outline" className="rounded-full">
                            #{String(item.index + 1).padStart(2, "0")}
                          </Badge>
                        </div>
                        <h3 className="mt-4 line-clamp-2 text-base font-semibold text-[var(--indigo-night)]">
                          {item.course.title}
                        </h3>
                        {item.course.summary && (
                          <p className="mt-2 line-clamp-3 text-sm leading-5 text-muted-foreground">
                            {item.course.summary}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              progressAccents[item.index % progressAccents.length],
                            )}
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{item.lessons.length} lessons</span>
                          <span>{item.pct}% complete</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resources" className="mt-0 space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  load();
                }}
                className="app-glass flex flex-col gap-2 rounded-2xl p-3 sm:flex-row"
              >
                <div className="app-search">
                  <Search />
                  <Input
                    placeholder="Search resources..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <Button type="submit" className="rounded-full sm:w-auto">
                  Search
                </Button>
              </form>

              {resources.length === 0 ? (
                <div className="app-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                  No resources yet.
                </div>
              ) : (
                <div className="grid gap-2">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="app-glass flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-[var(--indigo-night)]">
                            {resource.title}
                          </h3>
                          {resource.category && (
                            <Badge variant="secondary" className="rounded-full">
                              {resource.category}
                            </Badge>
                          )}
                        </div>
                        {resource.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {resource.description}
                          </p>
                        )}
                      </div>
                      {resource.kind === "link" ? (
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" /> Open
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => openFile(resource.file_path)}
                        >
                          <FileDown className="h-4 w-4" /> Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>

        <aside className="space-y-4">
          <section className="app-glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Next up
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--indigo-night)]">
                  Suggested order
                </h2>
              </div>
              <PlayCircle className="h-5 w-5 text-[var(--saffron)]" />
            </div>
            <div className="mt-4 space-y-2">
              {nextItems.length === 0 ? (
                <p className="rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  All visible lessons are complete. Pick another course to revisit.
                </p>
              ) : (
                nextItems.map((item) => (
                  <Link
                    key={item.course.id}
                    to="/app/education/$courseSlug/$lessonSlug"
                    params={{ courseSlug: item.course.slug, lessonSlug: item.nextLesson.slug }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3 transition hover:border-[var(--saffron)]/60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--saffron)]/15 text-xs font-semibold text-[var(--indigo-night)]">
                      {item.nextLesson.duration_mins ?? "--"}m
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {item.nextLesson.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.course.title}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="app-glass rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Activity
            </p>
            <div className="mt-3 space-y-2">
              {recentItems.map((course) => (
                <Link
                  key={course.id}
                  to="/app/education/$courseSlug"
                  params={{ courseSlug: course.slug }}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 p-3 text-sm transition hover:bg-muted/70"
                >
                  <span className="min-w-0 truncate font-medium">{course.title}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
              {recentItems.length === 0 && (
                <p className="text-sm text-muted-foreground">Course activity will appear here.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="app-glass rounded-2xl p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--indigo-night)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--saffron)]">
              <Building2 className="h-3.5 w-3.5" />
              AI companies to study
            </span>
            <h2 className="mt-3 text-xl font-semibold text-[var(--indigo-night)]">
              10 widely watched AI companies
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Use these as pattern studies: product UX, model strategy, developer ecosystem,
              infrastructure, safety, distribution, and how each company explains AI to users.
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full">
            Updated reference links
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {aiCompanyWatchlist.map((company, index) => (
            <article
              key={company.name}
              className="flex min-h-[17rem] flex-col justify-between rounded-2xl border border-border bg-card/75 p-4 transition hover:-translate-y-0.5 hover:border-[var(--saffron)]/60 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold",
                      courseAccents[index % courseAccents.length],
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Video className="h-4 w-4 text-[var(--saffron)]" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--indigo-night)]">
                  {company.name}
                </h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {company.focus}
                </p>
                <p className="mt-3 line-clamp-4 text-sm leading-5 text-muted-foreground">
                  {company.about}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={company.aboutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-[var(--indigo-night)] transition hover:border-[var(--saffron)]/70"
                >
                  About
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={company.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--indigo-night)] px-3 text-xs font-semibold text-[var(--parchment)] transition hover:bg-[var(--saffron)] hover:text-[var(--indigo-night)]"
                >
                  Video
                  <PlayCircle className="h-3 w-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-3">
      <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl", tone)}>
        {icon}
      </span>
      <p className="mt-3 text-2xl font-semibold text-[var(--indigo-night)]">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
