import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronLeft, FileDown, RotateCcw } from "lucide-react";
import {
  getLessonBySlug,
  markLessonComplete,
  unmarkLessonComplete,
  submitQuiz,
  getSignedEducationUrl,
} from "@/server/education.functions";

export const Route = createFileRoute("/app/education/$courseSlug/$lessonSlug")({
  component: LessonPage,
});

function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
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

  const video = useMemo(() => (data?.lesson?.video_url ? embedUrl(data.lesson.video_url) : null), [data]);

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
        toast.error(`Scored ${res.score}% — needs ${data.quiz.passing_score}%`);
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

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8">Lesson not found.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <Link
        to="/app/education/$courseSlug"
        params={{ courseSlug }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {data.course.title}
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">{data.lesson.title}</h1>
        {data.lesson.duration_mins && (
          <Badge variant="outline">{data.lesson.duration_mins} min</Badge>
        )}
      </header>

      {video && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border">
          <iframe src={video} className="h-full w-full" allowFullScreen title="Lesson video" />
        </div>
      )}

      {data.lesson.content && (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
          {data.lesson.content}
        </div>
      )}

      {data.attachments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Attachments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.attachments.map((a: any) => (
              <Button key={a.id} variant="outline" size="sm" onClick={() => downloadAttachment(a.file_path)} className="gap-2">
                <FileDown className="h-4 w-4" /> {a.file_name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {data.quiz && data.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{data.quiz.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Pass with {data.quiz.passing_score}% or higher.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.lastAttempt && (
              <div className={`rounded-md border p-3 text-sm ${data.lastAttempt.passed ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-orange-500 bg-orange-50 dark:bg-orange-950"}`}>
                Last attempt: {data.lastAttempt.score}% — {data.lastAttempt.passed ? "Passed" : "Try again"}
              </div>
            )}
            {data.questions.map((q: any, i: number) => (
              <div key={q.id} className="space-y-2">
                <p className="font-medium">{i + 1}. {q.prompt}</p>
                <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))}>
                  {q.options.map((o: any) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <RadioGroupItem id={o.id} value={o.id} />
                      <Label htmlFor={o.id} className="font-normal">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
            <Button onClick={onSubmitQuiz} disabled={busy}>
              {data.lastAttempt ? <><RotateCcw className="h-4 w-4" /> Retake quiz</> : "Submit quiz"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={toggleComplete} disabled={busy} variant={data.completed ? "outline" : "default"}>
          <CheckCircle2 className="h-4 w-4" />
          {data.completed ? "Mark as incomplete" : "Mark complete"}
        </Button>
      </div>
    </div>
  );
}