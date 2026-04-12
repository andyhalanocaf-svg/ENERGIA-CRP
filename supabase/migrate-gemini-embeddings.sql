-- ============================================================
-- PresupAI — Migración: OpenAI embeddings → Gemini embeddings
-- gemini-embedding-001 produce vectores de 768 dimensiones
--
-- Ejecuta este script en Supabase SQL Editor
-- ANTES de correr schema.sql si es una instalación nueva.
-- Si ya tienes datos en kb_documents, este script los borra
-- para limpiar los embeddings de 1536 dims incompatibles.
-- ============================================================

-- 1. Eliminar el índice ivfflat (depende de la dimensión)
DROP INDEX IF EXISTS kb_documents_embedding_idx;

-- 2. Eliminar la función de búsqueda (depende del tipo del vector)
DROP FUNCTION IF EXISTS public.search_kb_documents(vector(1536), float, int);

-- 3. Cambiar la columna embedding a 768 dimensiones (Gemini)
--    Si ya tienes documentos con embeddings, los borramos primero
UPDATE public.kb_documents SET embedding = NULL;

ALTER TABLE public.kb_documents
  ALTER COLUMN embedding TYPE vector(768)
  USING embedding::text::vector(768);

-- 4. Recrear la función de búsqueda con el nuevo tipo
CREATE OR REPLACE FUNCTION public.search_kb_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid, title text, content text, similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.kb_documents kb
  WHERE kb.is_active = true
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Recrear el índice ivfflat para la nueva dimensión
CREATE INDEX IF NOT EXISTS kb_documents_embedding_idx
  ON public.kb_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ✅ Verificación
SELECT 'Migración completa: embedding ahora es vector(768) para Gemini gemini-embedding-001' AS status;
