import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ExternalLink,
  FileDown,
  PlayCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  getLessonBySlug,
  getSignedEducationUrl,
  markLessonComplete,
  submitQuiz,
  unmarkLessonComplete,
} from "@/server/education.functions";

export const Route = createFileRoute("/app/education/$courseSlug/$lessonSlug")({
  component: LessonPage,
});

function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.includes("/results")) return null;
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video${u.pathname}`;
    return url;
  } catch {
    return null;
  }
}

function videoLabel(url: string): { title: string; description: string; action: string } {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname.includes("/results")) {
      return {
        title: "Latest YouTube reference",
        description: "Opens a current YouTube search for recent tutorials on this exact step.",
        action: "Open latest videos",
      };
    }
  } catch {
    // Fall through to generic copy.
  }

  return {
    title: "Lesson video",
    description: "Open the referenced video in a new tab.",
    action: "Open video",
  };
}

function LessonPage() {
  const { courseSlug, lessonSlug } = useParams({ from: "/app/education/$courseSlug/$lessonSlug" });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await getLessonBySlug(courseSlug, lessonSlug);
      setData(d);
      setAnswers({});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug, lessonSlug]);

  const videoUrl = data?.lesson?.video_url ?? null;
  const video = useMemo(() => (videoUrl ? embedUrl(videoUrl) : null), [videoUrl]);
  const videoCopy = useMemo(() => (videoUrl ? videoLabel(videoUrl) : null), [videoUrl]);

  async function toggleComplete() {
    if (!data) return;
    setBusy(true);
    try {
      if (data.completed) {
        await unmarkLessonComplete(data.lesson.id);
        toast.success("Marked incomplete");
      } else {
        await markLessonComplete(data.lesson.id);
        toast.success("Lesson complete");
      }
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitQuiz() {
    if (!data?.quiz) return;
    if (Object.keys(answers).length !== data.questions.length) {
      toast.error("Answer every question first.");
      return;
    }
    setBusy(true);
    try {
      const res = await submitQuiz(data.quiz.id, answers);
      if (res.passed) {
        await markLessonComplete(data.lesson.id);
        toast.success(`Passed with ${res.score}%`);
      } else {
        toast.error(`Scored ${res.score}% - needs ${data.quiz.passing_score}%`);
      }
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadAttachment(path: string) {
    try {
      const url = await getSignedEducationUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading lesson...</div>;
  if (!data) return <div className="p-6">Lesson not found.</div>;

  const hasQuiz = !!data.quiz && data.questions.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-4 md:p-5">
      <Link
        to="/app/education/$courseSlug"
        params={{ courseSlug }}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-[var(--indigo-night)]"
      >
        <ChevronLeft className="h-4 w-4" /> {data.course.title}
      </Link>

      <section className="app-glass rounded-2xl p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[var(--saffron)] text-[var(--indigo-night)]">
                Lesson
              </Badge>
              {data.completed && (
                <Badge className="rounded-full bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                </Badge>
              )}
              {data.lesson.duration_mins && (
                <Badge variant="outline" className="rounded-full">
                  <Clock3 className="h-3.5 w-3.5" /> {data.lesson.duration_mins} min
                </Badge>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-[var(--indigo-night)] md:text-3xl">
              {data.lesson.title}
            </h1>
          </div>
          <Button
            onClick={toggleComplete}
            disabled={busy}
            variant={data.completed ? "outline" : "default"}
            className="rounded-full lg:min-w-44"
          >
            <CheckCircle2 className="h-4 w-4" />
            {data.completed ? "Mark incomplete" : "Mark complete"}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0 space-y-4">
          {video && (
            <section className="app-glass overflow-hidden rounded-2xl p-2">
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
                <iframe
                  src={video}
                  className="h-full w-full"
                  allowFullScreen
                  title="Lesson video"
                />
              </div>
            </section>
          )}

          {videoUrl && !video && (
            <section className="app-glass rounded-2xl p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--saffron)]/15 text-[var(--indigo-night)]">
                    <PlayCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[var(--indigo-night)]">
                      {videoCopy?.title ?? "Lesson video"}
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      {videoCopy?.description ?? "Open the referenced video in a new tab."}
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> {videoCopy?.action ?? "Open video"}
                  </a>
                </Button>
              </div>
            </section>
          )}

          <section className="app-glass rounded-2xl p-4 md:p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--saffron)]" />
              <h2 className="text-lg font-semibold text-[var(--indigo-night)]">Lesson notes</h2>
            </div>
            {data.lesson.content ? (
              <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap leading-7 dark:prose-invert">
                {data.lesson.content}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No written notes yet. Use the video reference and mark this lesson when complete.
              </p>
            )}
          </section>

          {hasQuiz && (
            <section className="app-glass rounded-2xl p-4 md:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--indigo-night)]">
                    {data.quiz.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Pass with {data.quiz.passing_score}% or higher.
                  </p>
                </div>
                {data.lastAttempt && (
                  <Badge
                    className={
                      data.lastAttempt.passed
                        ? "rounded-full bg-emerald-100 text-emerald-800"
                        : "rounded-full bg-[var(--saffron)]/20 text-[var(--indigo-night)]"
                    }
                  >
                    {data.lastAttempt.score}% {data.lastAttempt.passed ? "passed" : "retry"}
                  </Badge>
                )}
              </div>

              <div className="mt-5 space-y-5">
                {data.questions.map((question: any, index: number) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-border bg-card/70 p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--indigo-night)]">
                      {index + 1}. {question.prompt}
                    </p>
                    <RadioGroup
                      value={answers[question.id] ?? ""}
                      onValueChange={(value) =>
                        setAnswers((state) => ({ ...state, [question.id]: value }))
                      }
                      className="mt-3 space-y-2"
                    >
                      {question.options.map((option: any) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <RadioGroupItem id={option.id} value={option.id} />
                          <Label htmlFor={option.id} className="text-sm font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
                <Button onClick={onSubmitQuiz} disabled={busy} className="rounded-full">
                  {data.lastAttempt ? (
                    <>
                      <RotateCcw className="h-4 w-4" /> Retake quiz
                    </>
                  ) : (
                    "Submit quiz"
                  )}
                </Button>
              </div>
            </section>
          )}
        </main>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="app-glass rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Study card
            </p>
            <div className="mt-3 space-y-3">
              <InfoLine label="Course" value={data.course.title} />
              <InfoLine label="Duration" value={`${data.lesson.duration_mins ?? "--"} min`} />
              <InfoLine label="Quiz" value={hasQuiz ? "Available" : "Not added"} />
              <InfoLine label="Status" value={data.completed ? "Complete" : "In progress"} />
            </div>
          </section>

          {data.attachments.length > 0 && (
            <section className="app-glass rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Attachments
              </p>
              <div className="mt-3 space-y-2">
                {data.attachments.map((attachment: any) => (
                  <Button
                    key={attachment.id}
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAttachment(attachment.file_path)}
                    className="w-full justify-start rounded-full"
                  >
                    <FileDown className="h-4 w-4" /> {attachment.file_name}
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-[var(--saffron)]/35 bg-[var(--saffron)]/15 p-4">
            <h2 className="text-sm font-semibold text-[var(--indigo-night)]">Suggested flow</h2>
            <ol className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">
              <li>1. Open the latest video reference.</li>
              <li>2. Apply the step in your builder tool.</li>
              <li>3. Complete the quiz or mark done.</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-semibold text-[var(--indigo-night)]">{value}</span>
    </div>
  );
}
