import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, ChevronLeft } from "lucide-react";
import { getCourseBySlug } from "@/server/education.functions";

export const Route = createFileRoute("/app/education/$courseSlug")({
  component: CoursePage,
});

function CoursePage() {
  const { courseSlug } = useParams({ from: "/app/education/$courseSlug" });
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

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8">Course not found.</div>;

  const allLessons = data.modules.flatMap((m: any) => m.lessons);
  const done = allLessons.filter((l: any) => data.progress[l.id]).length;
  const pct = allLessons.length ? Math.round((done / allLessons.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <Link to="/app/education" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to Academy
      </Link>
      <header className="space-y-2">
        {data.course.cover_url && (
          <img src={data.course.cover_url} alt="" className="aspect-[3/1] w-full rounded-lg object-cover" />
        )}
        <h1 className="font-display text-3xl font-semibold">{data.course.title}</h1>
        {data.course.summary && <p className="text-muted-foreground">{data.course.summary}</p>}
        {allLessons.length > 0 && (
          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{done} of {allLessons.length} lessons complete</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>
        )}
      </header>

      <div className="space-y-4">
        {data.modules.length === 0 && <p className="text-muted-foreground">No modules yet.</p>}
        {data.modules.map((m: any) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="text-lg">{m.title}</CardTitle>
              {m.summary && <p className="text-sm text-muted-foreground">{m.summary}</p>}
            </CardHeader>
            <CardContent className="space-y-1">
              {m.lessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet.</p>}
              {m.lessons.filter((l: any) => l.status === "published").map((l: any) => (
                <Link
                  key={l.id}
                  to="/app/education/$courseSlug/$lessonSlug"
                  params={{ courseSlug, lessonSlug: l.slug }}
                  className="flex items-center justify-between rounded-md border px-3 py-2 transition hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    {data.progress[l.id] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">{l.title}</span>
                  </div>
                  {l.duration_mins && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" /> {l.duration_mins}m
                    </Badge>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}