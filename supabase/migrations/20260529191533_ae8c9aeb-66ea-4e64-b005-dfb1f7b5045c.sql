
-- ============================================================
-- Education CMS foundation
-- ============================================================

-- Helper: who can author education content
CREATE OR REPLACE FUNCTION public.can_author_education(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'editor')
    OR EXISTS (
      SELECT 1 FROM public.chapter_members
      WHERE user_id = _user_id AND role = 'lead'
    )
$$;

REVOKE EXECUTE ON FUNCTION public.can_author_education(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_author_education(uuid) TO authenticated, service_role;

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  cover_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  chapter_id uuid,
  created_by uuid NOT NULL,
  published_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read published courses"
  ON public.courses FOR SELECT TO authenticated
  USING (status = 'published' OR public.can_author_education(auth.uid()));

CREATE POLICY "Authors insert courses"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (public.can_author_education(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Authors update courses"
  ON public.courses FOR UPDATE TO authenticated
  USING (public.can_author_education(auth.uid()));

CREATE POLICY "Admins delete courses"
  ON public.courses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- COURSE MODULES
-- ============================================================
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read modules of readable courses"
  ON public.course_modules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_modules.course_id
      AND (c.status = 'published' OR public.can_author_education(auth.uid()))
  ));

CREATE POLICY "Authors write modules"
  ON public.course_modules FOR ALL TO authenticated
  USING (public.can_author_education(auth.uid()))
  WITH CHECK (public.can_author_education(auth.uid()));

CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_course_modules_course ON public.course_modules(course_id, sort_order);

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  content text,
  video_url text,
  duration_mins int,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read published lessons"
  ON public.lessons FOR SELECT TO authenticated
  USING (
    public.can_author_education(auth.uid())
    OR (status = 'published' AND EXISTS (
      SELECT 1 FROM public.course_modules m
      JOIN public.courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND c.status = 'published'
    ))
  );

CREATE POLICY "Authors write lessons"
  ON public.lessons FOR ALL TO authenticated
  USING (public.can_author_education(auth.uid()))
  WITH CHECK (public.can_author_education(auth.uid()));

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lessons_module ON public.lessons(module_id, sort_order);

-- ============================================================
-- LESSON ATTACHMENTS
-- ============================================================
CREATE TABLE public.lesson_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_attachments TO authenticated;
GRANT ALL ON public.lesson_attachments TO service_role;
ALTER TABLE public.lesson_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read attachments of readable lessons"
  ON public.lesson_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_attachments.lesson_id
      AND (public.can_author_education(auth.uid())
           OR (l.status = 'published' AND c.status = 'published'))
  ));

CREATE POLICY "Authors write attachments"
  ON public.lesson_attachments FOR ALL TO authenticated
  USING (public.can_author_education(auth.uid()))
  WITH CHECK (public.can_author_education(auth.uid()) AND uploaded_by = auth.uid());

CREATE INDEX idx_lesson_attachments_lesson ON public.lesson_attachments(lesson_id);

-- ============================================================
-- RESOURCE LIBRARY
-- ============================================================
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  kind text NOT NULL CHECK (kind IN ('link','file')),
  url text,
  file_path text,
  file_name text,
  mime_type text,
  chapter_id uuid,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read published resources"
  ON public.resources FOR SELECT TO authenticated
  USING (status = 'published' OR public.can_author_education(auth.uid()));

CREATE POLICY "Authors insert resources"
  ON public.resources FOR INSERT TO authenticated
  WITH CHECK (public.can_author_education(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Authors update resources"
  ON public.resources FOR UPDATE TO authenticated
  USING (public.can_author_education(auth.uid()));

CREATE POLICY "Admins delete resources"
  ON public.resources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_resources_category ON public.resources(category);
CREATE INDEX idx_resources_tags ON public.resources USING GIN(tags);

-- ============================================================
-- QUIZZES
-- ============================================================
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  passing_score int NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read quizzes for readable lessons"
  ON public.quizzes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = quizzes.lesson_id
      AND (public.can_author_education(auth.uid())
           OR (l.status = 'published' AND c.status = 'published'))
  ));

CREATE POLICY "Authors write quizzes"
  ON public.quizzes FOR ALL TO authenticated
  USING (public.can_author_education(auth.uid()))
  WITH CHECK (public.can_author_education(auth.uid()));

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read questions for readable quizzes"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE q.id = quiz_questions.quiz_id
      AND (public.can_author_education(auth.uid())
           OR (l.status = 'published' AND c.status = 'published'))
  ));

CREATE POLICY "Authors write quiz questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (public.can_author_education(auth.uid()))
  WITH CHECK (public.can_author_education(auth.uid()));

CREATE INDEX idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, sort_order);

-- ============================================================
-- QUIZ OPTIONS
-- ============================================================
CREATE TABLE public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_options TO authenticated;
GRANT ALL ON public.quiz_options TO service_role;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

-- Members can see options but is_correct is filtered in server fn responses
CREATE POLICY "Members read options for readable questions"
  ON public.quiz_options FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE qq.id = quiz_options.question_id
      AND (public.can_author_education(auth.uid())
           OR (l.status = 'published' AND c.status = 'published'))
  ));

CREATE POLICY "Authors write quiz options"
  ON public.quiz_options FOR ALL TO authenticated
  USING (public.can_author_education(auth.uid()))
  WITH CHECK (public.can_author_education(auth.uid()));

CREATE INDEX idx_quiz_options_question ON public.quiz_options(question_id, sort_order);

-- ============================================================
-- LESSON PROGRESS
-- ============================================================
CREATE TABLE public.lesson_progress (
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own progress"
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members write own progress"
  ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members delete own progress"
  ON public.lesson_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own attempts"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Members create own attempts"
  ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id, quiz_id);

-- ============================================================
-- STORAGE BUCKET (private; access via signed URLs from app)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('education', 'education', false)
ON CONFLICT (id) DO NOTHING;

-- Logged-in members can read all education files
CREATE POLICY "Members read education files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'education');

-- Only education authors can upload / modify / delete
CREATE POLICY "Authors upload education files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'education' AND public.can_author_education(auth.uid()));

CREATE POLICY "Authors update education files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'education' AND public.can_author_education(auth.uid()));

CREATE POLICY "Authors delete education files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'education' AND public.can_author_education(auth.uid()));
