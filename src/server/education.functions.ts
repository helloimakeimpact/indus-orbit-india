import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
const BUCKET = "education";

// ---------- Reads ----------

export async function listPublishedCourses() {
  const { data, error } = await sb
    .from("courses")
    .select("id, slug, title, summary, cover_url, status, sort_order, published_at, chapter_id")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function listAllCoursesForAdmin() {
  const { data, error } = await sb
    .from("courses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function getCourseBySlug(slug: string) {
  const { data: course, error } = await sb
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!course) return null;

  const { data: modules } = await sb
    .from("course_modules")
    .select("*")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  const moduleIds = (modules ?? []).map((m: any) => m.id);
  let lessons: any[] = [];
  if (moduleIds.length) {
    const { data: ls } = await sb
      .from("lessons")
      .select("id, module_id, slug, title, duration_mins, sort_order, status")
      .in("module_id", moduleIds)
      .order("sort_order", { ascending: true });
    lessons = ls ?? [];
  }

  // user progress
  const { data: userData } = await supabase.auth.getUser();
  let progress: Record<string, boolean> = {};
  if (userData.user && lessons.length) {
    const { data: prog } = await sb
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", userData.user.id)
      .in("lesson_id", lessons.map((l) => l.id));
    progress = Object.fromEntries((prog ?? []).map((p: any) => [p.lesson_id, true]));
  }

  return {
    course,
    modules: (modules ?? []).map((m: any) => ({
      ...m,
      lessons: lessons.filter((l) => l.module_id === m.id),
    })),
    progress,
  };
}

export async function getLessonBySlug(courseSlug: string, lessonSlug: string) {
  const { data: course } = await sb
    .from("courses")
    .select("id, slug, title")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) return null;

  const { data: modules } = await sb
    .from("course_modules")
    .select("id, title, sort_order")
    .eq("course_id", course.id);
  const moduleIds = (modules ?? []).map((m: any) => m.id);
  if (!moduleIds.length) return null;

  const { data: lesson } = await sb
    .from("lessons")
    .select("*")
    .in("module_id", moduleIds)
    .eq("slug", lessonSlug)
    .maybeSingle();
  if (!lesson) return null;

  const [{ data: attachments }, { data: quiz }] = await Promise.all([
    sb.from("lesson_attachments").select("*").eq("lesson_id", lesson.id),
    sb.from("quizzes").select("*").eq("lesson_id", lesson.id).maybeSingle(),
  ]);

  let questions: any[] = [];
  if (quiz) {
    const { data: qs } = await sb
      .from("quiz_questions")
      .select("id, prompt, sort_order")
      .eq("quiz_id", quiz.id)
      .order("sort_order", { ascending: true });
    questions = qs ?? [];
    if (questions.length) {
      const { data: opts } = await sb
        .from("quiz_options")
        .select("id, question_id, label, sort_order")
        .in("question_id", questions.map((q) => q.id))
        .order("sort_order", { ascending: true });
      questions = questions.map((q: any) => ({
        ...q,
        options: (opts ?? []).filter((o: any) => o.question_id === q.id),
      }));
    }
  }

  const { data: userData } = await supabase.auth.getUser();
  let completed = false;
  let lastAttempt: any = null;
  if (userData.user) {
    const { data: prog } = await sb
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", userData.user.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle();
    completed = !!prog;
    if (quiz) {
      const { data: att } = await sb
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("quiz_id", quiz.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastAttempt = att ?? null;
    }
  }

  return { course, modules: modules ?? [], lesson, attachments: attachments ?? [], quiz, questions, completed, lastAttempt };
}

export async function markLessonComplete(lessonId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in required");
  const { error } = await sb
    .from("lesson_progress")
    .upsert({ user_id: userData.user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });
  if (error) throw new Error(error.message);
}

export async function unmarkLessonComplete(lessonId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in required");
  const { error } = await sb
    .from("lesson_progress")
    .delete()
    .eq("user_id", userData.user.id)
    .eq("lesson_id", lessonId);
  if (error) throw new Error(error.message);
}

// answers: { [questionId]: optionId }
export async function submitQuiz(quizId: string, answers: Record<string, string>) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in required");

  const { data: quiz } = await sb.from("quizzes").select("*").eq("id", quizId).maybeSingle();
  if (!quiz) throw new Error("Quiz not found");

  const { data: questions } = await sb.from("quiz_questions").select("id").eq("quiz_id", quizId);
  const qIds = (questions ?? []).map((q: any) => q.id);
  const { data: options } = await sb
    .from("quiz_options")
    .select("id, question_id, is_correct")
    .in("question_id", qIds);

  const correctByQ = new Map<string, string>();
  for (const o of options ?? []) if (o.is_correct) correctByQ.set(o.question_id, o.id);

  const total = qIds.length || 1;
  let right = 0;
  for (const qid of qIds) if (answers[qid] && answers[qid] === correctByQ.get(qid)) right++;
  const score = Math.round((right / total) * 100);
  const passed = score >= (quiz.passing_score ?? 70);

  const { error } = await sb.from("quiz_attempts").insert({
    user_id: userData.user.id,
    quiz_id: quizId,
    score,
    passed,
    answers,
  });
  if (error) throw new Error(error.message);
  return { score, passed, total, right };
}

// ---------- Resources ----------

export async function listResources(opts: { query?: string; category?: string } = {}) {
  let q = sb.from("resources").select("*").eq("status", "published").order("created_at", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.query) q = q.ilike("title", `%${opts.query}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function listAllResourcesForAdmin() {
  const { data, error } = await sb
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

// ---------- Storage helpers ----------

export async function uploadEducationFile(file: File, prefix: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in required");
  const path = `${prefix}/${userData.user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return { path, name: file.name, size: file.size, mime: file.type };
}

export async function getSignedEducationUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ---------- Admin CRUD ----------

export async function createCourse(input: { slug: string; title: string; summary?: string; cover_url?: string }) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in required");
  const { data, error } = await sb
    .from("courses")
    .insert({ ...input, created_by: userData.user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCourse(id: string, patch: Record<string, any>) {
  const { error } = await sb.from("courses").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCourse(id: string) {
  const { error } = await sb.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createModule(input: { course_id: string; title: string; summary?: string; sort_order?: number }) {
  const { data, error } = await sb.from("course_modules").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateModule(id: string, patch: Record<string, any>) {
  const { error } = await sb.from("course_modules").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteModule(id: string) {
  const { error } = await sb.from("course_modules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createLesson(input: {
  module_id: string;
  slug: string;
  title: string;
  content?: string;
  video_url?: string;
  duration_mins?: number;
  sort_order?: number;
}) {
  const { data, error } = await sb.from("lessons").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateLesson(id: string, patch: Record<string, any>) {
  const { error } = await sb.from("lessons").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLesson(id: string) {
  const { error } = await sb.from("lessons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addLessonAttachment(lessonId: string, file: File) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in required");
  const up = await uploadEducationFile(file, `lessons/${lessonId}`);
  const { error } = await sb.from("lesson_attachments").insert({
    lesson_id: lessonId,
    file_name: up.name,
    file_path: up.path,
    file_size: up.size,
    mime_type: up.mime,
    uploaded_by: userData.user.id,
  });
  if (error) throw new Error(error.message);
}

export async function deleteLessonAttachment(id: string, path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
  const { error } = await sb.from("lesson_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createResource(input: {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  kind: "link" | "file";
  url?: string;
  file_path?: string;
  file_name?: string;
  mime_type?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in required");
  const { data, error } = await sb
    .from("resources")
    .insert({ ...input, created_by: userData.user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateResource(id: string, patch: Record<string, any>) {
  const { error } = await sb.from("resources").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteResource(id: string) {
  const { error } = await sb.from("resources").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Quiz admin ----------

export async function getQuizForEditing(lessonId: string) {
  const { data: quiz } = await sb.from("quizzes").select("*").eq("lesson_id", lessonId).maybeSingle();
  if (!quiz) return { quiz: null, questions: [] };
  const { data: qs } = await sb
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("sort_order", { ascending: true });
  const qIds = (qs ?? []).map((q: any) => q.id);
  let opts: any[] = [];
  if (qIds.length) {
    const { data: os } = await sb
      .from("quiz_options")
      .select("*")
      .in("question_id", qIds)
      .order("sort_order", { ascending: true });
    opts = os ?? [];
  }
  return {
    quiz,
    questions: (qs ?? []).map((q: any) => ({ ...q, options: opts.filter((o) => o.question_id === q.id) })),
  };
}

export async function upsertQuiz(lessonId: string, title: string, passingScore: number) {
  const existing = await sb.from("quizzes").select("id").eq("lesson_id", lessonId).maybeSingle();
  if (existing.data) {
    const { error } = await sb.from("quizzes").update({ title, passing_score: passingScore }).eq("id", existing.data.id);
    if (error) throw new Error(error.message);
    return existing.data.id as string;
  }
  const { data, error } = await sb
    .from("quizzes")
    .insert({ lesson_id: lessonId, title, passing_score: passingScore })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function addQuizQuestion(quizId: string, prompt: string) {
  const { data, error } = await sb
    .from("quiz_questions")
    .insert({ quiz_id: quizId, prompt })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteQuizQuestion(id: string) {
  const { error } = await sb.from("quiz_questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addQuizOption(questionId: string, label: string, isCorrect: boolean) {
  const { error } = await sb
    .from("quiz_options")
    .insert({ question_id: questionId, label, is_correct: isCorrect });
  if (error) throw new Error(error.message);
}

export async function deleteQuizOption(id: string) {
  const { error } = await sb.from("quiz_options").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteQuiz(quizId: string) {
  const { error } = await sb.from("quizzes").delete().eq("id", quizId);
  if (error) throw new Error(error.message);
}