import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, ExternalLink, FileDown, Search } from "lucide-react";
import {
  listPublishedCourses,
  listResources,
  getSignedEducationUrl,
} from "@/server/education.functions";

export const Route = createFileRoute("/app/education/")({
  component: EducationIndex,
});

function EducationIndex() {
  const [courses, setCourses] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([listPublishedCourses(), listResources({ query: q })]);
      setCourses(c);
      setResources(r);
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

  async function openFile(path: string) {
    try {
      const url = await getSignedEducationUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Academy</h1>
        <p className="text-sm text-muted-foreground">Courses and resources curated for the orbit.</p>
      </header>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="resources">Resource library</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : courses.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No courses published yet.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <Link key={c.id} to="/app/education/$courseSlug" params={{ courseSlug: c.slug }}>
                  <Card className="h-full transition hover:shadow-md">
                    {c.cover_url && (
                      <img src={c.cover_url} alt="" className="aspect-video w-full rounded-t-md object-cover" />
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-4 w-4" />
                        {c.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">{c.summary}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resources" className="mt-6 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search resources…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button type="submit">Search</Button>
          </form>

          {resources.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No resources yet.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {resources.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{r.title}</h3>
                        {r.category && <Badge variant="secondary">{r.category}</Badge>}
                        {(r.tags ?? []).map((t: string) => (
                          <Badge key={t} variant="outline">#{t}</Badge>
                        ))}
                      </div>
                      {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                    </div>
                    {r.kind === "link" ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" /> Open
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openFile(r.file_path)}>
                        <FileDown className="h-4 w-4" /> Download
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}