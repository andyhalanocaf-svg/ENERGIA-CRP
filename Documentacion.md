# PresupAI — Documentación Técnica Completa
> Sistema SaaS de Control Presupuestal con IA | CRP Radios  
> Versión 1.0.0 | Abril 2026

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Stack Tecnológico y Justificación](#2-stack-tecnológico-y-justificación)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Esquema de Base de Datos (Supabase)](#5-esquema-de-base-de-datos-supabase)
6. [Autenticación y Control de Acceso](#6-autenticación-y-control-de-acceso)
7. [Pipeline de Procesamiento Excel](#7-pipeline-de-procesamiento-excel)
8. [Módulo de Dashboard](#8-módulo-de-dashboard)
9. [Chatbot con IA — Mercury-2 + RAG](#9-chatbot-con-ia--mercury-2--rag)
10. [Gestión de Contexto del Chatbot](#10-gestión-de-contexto-del-chatbot)
11. [Diseño de API (Page Router)](#11-diseño-de-api-page-router)
12. [Sistema de UI — Tailwind + Shadcn/UI](#12-sistema-de-ui--tailwind--shadcnui)
13. [Seguridad](#13-seguridad)
14. [Rendimiento y Caché](#14-rendimiento-y-caché)
15. [Variables de Entorno](#15-variables-de-entorno)
16. [Estrategia de Deployment](#16-estrategia-de-deployment)
17. [Guía de Desarrollo Local](#17-guía-de-desarrollo-local)
18. [Estrategia de Testing](#18-estrategia-de-testing)
19. [Roadmap de Funcionalidades](#19-roadmap-de-funcionalidades)

---

## 1. Resumen Ejecutivo

### Problema que Resuelve

El sistema actual de control presupuestal de CRP Radios (CC231) opera con Excels manuales y un dashboard HTML estático generado mensualmente. Este flujo implica:
- Procesamiento manual de archivos Excel de seguimiento
- Dashboard no interactivo (HTML estático)
- Sin historización automática
- Sin herramienta de consulta inteligente sobre el presupuesto
- Sin gestión de roles ni acceso multi-usuario

### Solución Propuesta — PresupAI

Una plataforma SaaS web que:
1. **Automatiza** la ingesta de datos desde el Archivo Maestro Excel vía upload web
2. **Persiste** la data en Supabase con historización mensual y anual
3. **Visualiza** dashboards interactivos para todos los meses del año con KPIs en tiempo real
4. **Controla** el acceso con roles definidos (Super Admin, Admin, Analista, Viewer)
5. **Asiste** con un chatbot de IA (Mercury-2) entrenado con el contexto presupuestal de la empresa

---

## 2. Stack Tecnológico y Justificación

### Frontend & Framework

| Tecnología | Versión | Justificación |
|---|---|---|
| **Next.js** | 14.x | SSR/SSG, Page Router (requerido), API Routes integradas |
| **React** | 18.x | Ecosistema maduro, Concurrent Features |
| **TypeScript** | 5.x | Type safety, mejor DX, detección de errores en compile-time |
| **Tailwind CSS** | 3.x | Utility-first, diseño consistente, purge automático |
| **Shadcn/UI** | Latest | Componentes accesibles (Radix UI), sin dependencia de librería externa |

> **¿Por qué Page Router y no App Router?**  
> El Page Router tiene mayor madurez, documentación más amplia, y compatibilidad garantizada con librerías de terceros (como `ai` SDK de Vercel y algunas integraciones de Supabase). El App Router aún presenta incompatibilidades con ciertos providers de autenticación en producción.

### Backend & Infraestructura

| Tecnología | Versión | Justificación |
|---|---|---|
| **Supabase** | Latest | PostgreSQL gestionado + Auth + Storage + pgvector (RAG) |
| **Vercel** | Latest | Deployment optimizado para Next.js, Edge Functions, KV |
| **Vercel KV** | Latest | Redis gestionado para caché de embeddings |

### Procesamiento de Datos

| Tecnología | Justificación |
|---|---|
| **SheetJS (xlsx)** | Parseo de Excel en servidor sin dependencias nativas |
| **Supabase Storage** | Almacenamiento del archivo Excel original para auditoría |

### IA & Chatbot

| Tecnología | Justificación |
|---|---|
| **Vercel AI SDK (`ai`)** | Streaming, hooks de React, provider-agnostic |
| **Mercury-2 (InceptionLabs)** | Modelo difusión LLM seleccionado por el cliente |
| **pgvector (Supabase)** | Búsqueda semántica para RAG, sin infraestructura adicional |
| **OpenAI API** (embeddings) | `text-embedding-3-small` para vectorizar el KB del chatbot |

> **Nota sobre Mercury-2**: InceptionLabs Mercury-2 actualmente no tiene un provider nativo en Vercel AI SDK. Se implementará mediante un **custom provider adapter** que envuelve su REST API con el protocolo streaming de la SDK. Ver sección 9.

---

## 3. Arquitectura del Sistema

### Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                         │
│  Next.js Page Router  │  React 18  │  Tailwind + Shadcn/UI      │
└──────────────┬──────────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────────────────┐
│                    VERCEL EDGE / NODE.JS                         │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  API Routes │  │  Middleware  │  │   AI SDK Streaming     │  │
│  │  /pages/api │  │  (Auth JWT)  │  │   (Mercury-2 Adapter)  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬───────────┘  │
│         │                │                        │               │
└─────────┼────────────────┼────────────────────────┼──────────────┘
          │                │                        │
┌─────────▼────────────────▼────────────────────────▼──────────────┐
│                        SUPABASE                                    │
│                                                                    │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐  │
│  │ PostgreSQL │  │   Auth JWT   │  │  pgvector  │  │ Storage  │  │
│  │  (tables)  │  │  (sessions)  │  │ (RAG/KB)   │  │ (Excel)  │  │
│  └────────────┘  └──────────────┘  └────────────┘  └──────────┘  │
└────────────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────────┐
│                     SERVICIOS EXTERNOS                             │
│   InceptionLabs Mercury-2 API  │  OpenAI Embeddings API          │
│   Vercel KV (Redis caché)      │                                  │
└────────────────────────────────────────────────────────────────────┘
```

### Patrón de Arquitectura — Clean Code Adaptado a Next.js

Se implementa una **arquitectura de capas** dentro del monorepo Next.js:

```
Presentación (Pages + Components)
        ↕
Aplicación (Hooks + Use Cases)
        ↕
Dominio (Entities + Interfaces)
        ↕
Infraestructura (Supabase + Excel + AI)
```

**Principios aplicados:**
- **SRP**: Cada módulo tiene una única responsabilidad
- **DIP**: Las capas superiores dependen de abstracciones (interfaces), no de implementaciones concretas
- **Open/Closed**: Los providers de IA son intercambiables sin modificar la lógica de negocio
- **Repository Pattern**: Toda interacción con Supabase va a través de repositorios tipados

---

## 4. Estructura del Proyecto

```
presupai/
│
├── pages/                          # Next.js Page Router
│   ├── _app.tsx                    # Provider global (QueryClient, AuthProvider)
│   ├── _document.tsx               # HTML shell personalizado
│   ├── index.tsx                   # Redirect a /dashboard o /auth/login
│   │
│   ├── auth/
│   │   ├── login.tsx               # Página de login (Supabase Auth UI)
│   │   └── callback.tsx            # OAuth callback handler
│   │
│   ├── dashboard/
│   │   ├── index.tsx               # Dashboard anual (resumen 12 meses)
│   │   └── [year]/
│   │       └── [month].tsx         # Dashboard mensual detallado
│   │
│   ├── upload/
│   │   └── index.tsx               # Upload del Archivo Maestro Excel
│   │
│   ├── admin/
│   │   ├── index.tsx               # Panel de administración
│   │   ├── users.tsx               # Gestión de usuarios y roles
│   │   ├── allowed-emails.tsx      # Lista de correos autorizados
│   │   └── knowledge-base.tsx      # Gestión del contexto del chatbot
│   │
│   └── api/                        # API Routes (Node.js runtime)
│       ├── auth/
│       │   └── callback.ts         # Supabase OAuth callback
│       │
│       ├── upload/
│       │   ├── excel.ts            # POST: recibir y subir Excel a Storage
│       │   └── process.ts          # POST: parsear Excel y poblar tablas
│       │
│       ├── budget/
│       │   ├── index.ts            # GET: resumen anual
│       │   ├── [year]/
│       │   │   ├── index.ts        # GET: resumen del año
│       │   │   └── [month].ts      # GET: detalle mensual
│       │   └── export.ts           # GET: exportar consolidado GAF
│       │
│       ├── admin/
│       │   ├── users/
│       │   │   ├── index.ts        # GET lista / POST crear usuario
│       │   │   └── [id].ts         # PATCH / DELETE usuario
│       │   ├── allowed-emails/
│       │   │   ├── index.ts        # GET / POST correos permitidos
│       │   │   └── [id].ts         # DELETE correo
│       │   └── roles/
│       │       └── [userId].ts     # PATCH cambiar rol
│       │
│       └── chat/
│           ├── index.ts            # POST: streaming chat con Mercury-2
│           ├── sessions/
│           │   └── index.ts        # GET / POST sesiones de chat
│           └── kb/
│               ├── index.ts        # GET / POST documentos KB
│               ├── [id].ts         # PATCH / DELETE documento KB
│               └── embed.ts        # POST: re-vectorizar KB tras cambios
│
├── src/                            # Lógica de negocio (Clean Architecture)
│   │
│   ├── domain/                     # Capa de Dominio (sin dependencias externas)
│   │   ├── entities/
│   │   │   ├── BudgetLine.ts
│   │   │   ├── CostCenter.ts
│   │   │   ├── MonthlyExecution.ts
│   │   │   ├── User.ts
│   │   │   └── KbDocument.ts
│   │   ├── repositories/           # Interfaces (contratos)
│   │   │   ├── IBudgetLineRepository.ts
│   │   │   ├── IUserRepository.ts
│   │   │   ├── IKbDocumentRepository.ts
│   │   │   └── IFileUploadRepository.ts
│   │   └── value-objects/
│   │       ├── Money.ts            # Valor monetario con validación
│   │       ├── Month.ts            # Mes con validación (1-12)
│   │       └── UserRole.ts         # Enum de roles
│   │
│   ├── application/                # Capa de Aplicación (casos de uso)
│   │   ├── use-cases/
│   │   │   ├── budget/
│   │   │   │   ├── GetMonthlyBudget.ts
│   │   │   │   ├── GetAnnualSummary.ts
│   │   │   │   └── ExportGAFConsolidated.ts
│   │   │   ├── upload/
│   │   │   │   ├── UploadExcelFile.ts
│   │   │   │   └── ProcessMasterExcel.ts
│   │   │   ├── admin/
│   │   │   │   ├── CreateUser.ts
│   │   │   │   ├── UpdateUserRole.ts
│   │   │   │   ├── AddAllowedEmail.ts
│   │   │   │   └── RemoveUser.ts
│   │   │   └── chat/
│   │   │       ├── SendMessage.ts
│   │   │       ├── SearchKnowledgeBase.ts
│   │   │       └── UpdateKbDocument.ts
│   │   └── services/
│   │       ├── ExcelParserService.ts
│   │       ├── EmbeddingService.ts
│   │       └── BudgetAggregatorService.ts
│   │
│   └── infrastructure/             # Capa de Infraestructura (implementaciones)
│       ├── supabase/
│       │   ├── client.ts           # Supabase client (browser)
│       │   ├── server.ts           # Supabase client (server-side / API)
│       │   ├── repositories/
│       │   │   ├── SupabaseBudgetLineRepository.ts
│       │   │   ├── SupabaseUserRepository.ts
│       │   │   ├── SupabaseKbDocumentRepository.ts
│       │   │   └── SupabaseFileUploadRepository.ts
│       │   └── middleware.ts       # Supabase session refresh
│       ├── excel/
│       │   ├── ExcelParser.ts      # SheetJS wrapper
│       │   └── MasterExcelMapper.ts # Mapeo columnas → entidades dominio
│       ├── ai/
│       │   ├── mercury/
│       │   │   ├── MercuryProvider.ts    # Custom AI SDK provider
│       │   │   └── MercuryAdapter.ts     # Streaming adapter
│       │   └── embeddings/
│       │       └── OpenAIEmbedder.ts     # Vectorización con OpenAI
│       └── cache/
│           └── VercelKVCache.ts    # Redis caché wrapper
│
├── components/                     # Componentes React reutilizables
│   ├── ui/                         # Shadcn/UI components (auto-generados)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   ├── select.tsx
│   │   ├── input.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── AppShell.tsx            # Layout principal con sidebar
│   │   ├── Sidebar.tsx             # Navegación lateral
│   │   ├── Header.tsx              # Header con user menu
│   │   └── PageContainer.tsx       # Wrapper de páginas
│   ├── dashboard/
│   │   ├── KPICard.tsx             # Card de métricas
│   │   ├── BudgetProgressBar.tsx   # Barra de progreso presupuestal
│   │   ├── PartidasTable.tsx       # Tabla de partidas
│   │   ├── MonthSelector.tsx       # Selector mes/año
│   │   ├── ResponsableChart.tsx    # Chart por responsable
│   │   ├── CategoryBreakdown.tsx   # Desglose Cat A vs B
│   │   ├── ReprogramacionesTable.tsx
│   │   └── ExportButton.tsx        # Exportar a Excel
│   ├── upload/
│   │   ├── FileUploadZone.tsx      # Drag & drop zone
│   │   ├── UploadProgress.tsx      # Progress de procesamiento
│   │   └── UploadHistory.tsx       # Historial de uploads
│   ├── admin/
│   │   ├── UserTable.tsx           # Tabla de usuarios
│   │   ├── UserRoleSelect.tsx      # Selector de rol inline
│   │   ├── InviteUserModal.tsx     # Modal para agregar email
│   │   ├── AllowedEmailsList.tsx   # Lista de emails permitidos
│   │   └── KbDocumentEditor.tsx    # Editor de documentos KB
│   └── chat/
│       ├── ChatPanel.tsx           # Panel lateral del chatbot
│       ├── ChatMessage.tsx         # Burbuja de mensaje
│       ├── ChatInput.tsx           # Input con send button
│       └── TypingIndicator.tsx     # Indicador de escritura
│
├── hooks/                          # Custom React Hooks
│   ├── useAuth.ts                  # Estado de autenticación
│   ├── useBudget.ts                # Data del presupuesto mensual
│   ├── useAnnualSummary.ts         # Resumen anual
│   ├── useUpload.ts                # Lógica de upload
│   ├── useAdminUsers.ts            # CRUD de usuarios
│   └── useChat.ts                  # Wrapper de useChat (Vercel AI SDK)
│
├── lib/
│   ├── utils.ts                    # cn() y utilidades generales
│   ├── formatters.ts               # Formato moneda, porcentajes
│   ├── constants.ts                # ROLES, MONTHS, etc.
│   └── validations.ts              # Zod schemas
│
├── types/
│   ├── index.ts                    # Re-exports
│   ├── supabase.ts                 # Tipos auto-generados de Supabase
│   ├── api.ts                      # Request/Response types
│   └── charts.ts                   # Tipos para visualizaciones
│
├── styles/
│   └── globals.css                 # Tailwind base + CSS variables Shadcn
│
├── middleware.ts                   # Auth guard + role check
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── .env.local                      # Variables de entorno (no commit)
└── package.json
```

---

## 5. Esquema de Base de Datos (Supabase)

### Configuración Inicial

```sql
-- Habilitar extensión pgvector para RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Tablas

#### 5.1 `cost_centers` — Centros de Costo

```sql
CREATE TABLE public.cost_centers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(20)  UNIQUE NOT NULL,  -- Ej: 'CC231'
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.cost_centers IS 'Centros de costo de la empresa';
```

#### 5.2 `profiles` — Perfiles de Usuario

```sql
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR(255) UNIQUE NOT NULL,
  full_name   VARCHAR(255),
  avatar_url  TEXT,
  role        VARCHAR(50)  NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('super_admin', 'admin', 'analyst', 'viewer')),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear profile automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 5.3 `user_cost_centers` — Asignación Usuario-CC

```sql
CREATE TABLE public.user_cost_centers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cost_center_id  UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, cost_center_id)
);
```

#### 5.4 `allowed_emails` — Correos Autorizados por Super Admin

```sql
CREATE TABLE public.allowed_emails (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  assigned_role VARCHAR(50) DEFAULT 'viewer'
                 CHECK (assigned_role IN ('admin', 'analyst', 'viewer')),
  invited_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.allowed_emails IS
  'Lista blanca de correos que el super_admin autoriza a registrarse';
```

#### 5.5 `file_uploads` — Historial de Cargas

```sql
CREATE TABLE public.file_uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        VARCHAR(255) NOT NULL,
  storage_path    TEXT NOT NULL,         -- path en Supabase Storage
  file_size       BIGINT,                -- bytes
  uploaded_by     UUID REFERENCES public.profiles(id),
  cost_center_id  UUID REFERENCES public.cost_centers(id),
  year            INTEGER NOT NULL,
  file_type       VARCHAR(50) NOT NULL
                  CHECK (file_type IN ('master_annual', 'monthly_tracking')),
  status          VARCHAR(50) DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message   TEXT,
  rows_processed  INTEGER DEFAULT 0,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5.6 `budget_lines` — Líneas del Archivo Maestro

```sql
CREATE TABLE public.budget_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id       UUID REFERENCES public.file_uploads(id),
  cost_center_id  UUID NOT NULL REFERENCES public.cost_centers(id),
  year            INTEGER NOT NULL,
  line_number     INTEGER,
  
  -- Clasificación
  partida         VARCHAR(255) NOT NULL,   -- Categoría presupuestal
  description     TEXT,                    -- Descripción del gasto
  responsible     VARCHAR(255),            -- Ingeniería, Logística, etc.
  category        CHAR(1) NOT NULL         -- 'A' o 'B'
                  CHECK (category IN ('A', 'B')),
  
  -- Presupuesto mensual (S/)
  budget_jan      NUMERIC(15,2) DEFAULT 0,
  budget_feb      NUMERIC(15,2) DEFAULT 0,
  budget_mar      NUMERIC(15,2) DEFAULT 0,
  budget_apr      NUMERIC(15,2) DEFAULT 0,
  budget_may      NUMERIC(15,2) DEFAULT 0,
  budget_jun      NUMERIC(15,2) DEFAULT 0,
  budget_jul      NUMERIC(15,2) DEFAULT 0,
  budget_aug      NUMERIC(15,2) DEFAULT 0,
  budget_sep      NUMERIC(15,2) DEFAULT 0,
  budget_oct      NUMERIC(15,2) DEFAULT 0,
  budget_nov      NUMERIC(15,2) DEFAULT 0,
  budget_dec      NUMERIC(15,2) DEFAULT 0,
  total_annual    NUMERIC(15,2) DEFAULT 0,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (cost_center_id, year, line_number)
);

CREATE INDEX idx_budget_lines_cc_year ON public.budget_lines(cost_center_id, year);
CREATE INDEX idx_budget_lines_partida ON public.budget_lines(partida);
```

#### 5.7 `monthly_executions` — Seguimiento Mensual

```sql
CREATE TABLE public.monthly_executions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_line_id        UUID NOT NULL REFERENCES public.budget_lines(id),
  cost_center_id        UUID NOT NULL REFERENCES public.cost_centers(id),
  upload_id             UUID REFERENCES public.file_uploads(id),
  
  year                  INTEGER NOT NULL,
  month                 INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  
  -- Montos
  budgeted_amount       NUMERIC(15,2) DEFAULT 0,
  executed_amount       NUMERIC(15,2),
  projected_amount      NUMERIC(15,2),
  savings_amount        NUMERIC(15,2) DEFAULT 0,
  
  -- Estado de ejecución
  status                VARCHAR(50) DEFAULT 'pending'
                        CHECK (status IN (
                          'pending', 'executed', 'rescheduled',
                          'advance', 'savings', 'cancelled'
                        )),
  
  -- Reprogramaciones
  rescheduled_to_month  INTEGER CHECK (rescheduled_to_month BETWEEN 1 AND 12),
  rescheduled_from_month INTEGER CHECK (rescheduled_from_month BETWEEN 1 AND 12),
  rescheduled_year      INTEGER,
  
  -- Metadatos de validación
  validated             BOOLEAN DEFAULT FALSE,
  validated_by          UUID REFERENCES public.profiles(id),
  validated_at          TIMESTAMPTZ,
  notes                 TEXT,
  
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (budget_line_id, year, month)
);

CREATE INDEX idx_monthly_exec_cc_year_month 
  ON public.monthly_executions(cost_center_id, year, month);
CREATE INDEX idx_monthly_exec_status 
  ON public.monthly_executions(status);
```

#### 5.8 `kb_documents` — Base de Conocimiento del Chatbot

```sql
CREATE TABLE public.kb_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  category    VARCHAR(100) NOT NULL
              CHECK (category IN ('faq', 'process', 'definition', 'context', 'policy')),
  tags        TEXT[] DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  
  -- Control de versiones básico
  version     INTEGER DEFAULT 1,
  
  created_by  UUID REFERENCES public.profiles(id),
  updated_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_documents_category ON public.kb_documents(category);
CREATE INDEX idx_kb_documents_active ON public.kb_documents(is_active);
```

#### 5.9 `kb_embeddings` — Vectores para RAG

```sql
CREATE TABLE public.kb_embeddings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,       -- índice del fragmento en el doc
  chunk_text   TEXT NOT NULL,          -- texto del fragmento
  embedding    VECTOR(1536) NOT NULL,  -- vector OpenAI text-embedding-3-small
  token_count  INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (document_id, chunk_index)
);

-- Índice HNSW para búsqueda semántica rápida
CREATE INDEX idx_kb_embeddings_vector 
  ON public.kb_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

#### 5.10 `chat_sessions` + `chat_messages`

```sql
CREATE TABLE public.chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       VARCHAR(255) DEFAULT 'Nueva conversación',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  tokens_used INTEGER,
  metadata    JSONB DEFAULT '{}',       -- contexto RAG usado, chunks, etc.
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at);
```

### Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages    ENABLE ROW LEVEL SECURITY;

-- Helper function: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: usuario ve solo su perfil; super_admin ve todos
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR public.get_user_role() = 'super_admin'
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_super_admin_all" ON public.profiles
  FOR ALL USING (public.get_user_role() = 'super_admin');

-- Budget lines: todos los usuarios autenticados pueden leer
CREATE POLICY "budget_lines_read" ON public.budget_lines
  FOR SELECT USING (auth.role() = 'authenticated');

-- Budget lines: solo admin/super_admin pueden insertar/actualizar
CREATE POLICY "budget_lines_write" ON public.budget_lines
  FOR ALL USING (
    public.get_user_role() IN ('super_admin', 'admin')
  );

-- Chat: usuario solo ve sus propias sesiones
CREATE POLICY "chat_sessions_own" ON public.chat_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "chat_messages_own" ON public.chat_messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

-- KB documents: todos leen, solo admin/super_admin escriben
CREATE POLICY "kb_read" ON public.kb_documents
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = TRUE);

CREATE POLICY "kb_write" ON public.kb_documents
  FOR ALL USING (
    public.get_user_role() IN ('super_admin', 'admin')
  );
```

### Función RAG — Búsqueda Semántica

```sql
CREATE OR REPLACE FUNCTION public.search_kb(
  query_embedding VECTOR(1536),
  match_count     INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  document_id  UUID,
  title        VARCHAR,
  chunk_text   TEXT,
  category     VARCHAR,
  similarity   FLOAT
) AS $$
  SELECT
    kd.id        AS document_id,
    kd.title,
    ke.chunk_text,
    kd.category,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM public.kb_embeddings ke
  JOIN public.kb_documents kd ON ke.document_id = kd.id
  WHERE
    kd.is_active = TRUE
    AND 1 - (ke.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

---

## 6. Autenticación y Control de Acceso

### 6.1 Roles y Permisos

| Rol | Código | Descripción | Permisos |
|---|---|---|---|
| **Super Admin** | `super_admin` | Administrador total del sistema | ✅ Todo: gestión de usuarios, roles, correos permitidos, upload, dashboards, KB chatbot |
| **Admin** | `admin` | Administrador de CCs asignados | ✅ Upload Excel, editar KB chatbot, ver dashboards de sus CCs |
| **Analista** | `analyst` | Analista con acceso de lectura + chatbot | ✅ Ver dashboards de sus CCs, usar chatbot, exportar reportes |
| **Viewer** | `viewer` | Solo lectura | ✅ Ver dashboards de sus CCs asignados |

### 6.2 Flujo de Registro Controlado

```
Super Admin agrega email en lista blanca
           ↓
     Usuario recibe invitación (o navega a /auth/login)
           ↓
     Sistema verifica email en tabla allowed_emails
           ↓
  ✅ Email autorizado → Registro permitido con rol asignado
  ❌ Email no autorizado → Acceso denegado
```

### 6.3 Implementación del Middleware

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/upload', '/admin'];
const ADMIN_ONLY_ROUTES = ['/admin'];
const SUPER_ADMIN_ROUTES = ['/admin/users', '/admin/allowed-emails'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Refrescar sesión automáticamente
  const { data: { session } } = await supabase.auth.getSession();
  
  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some(r => path.startsWith(r));
  
  // Redirigir a login si no hay sesión
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
  
  if (session) {
    // Obtener rol del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', session.user.id)
      .single();
    
    // Cuenta desactivada
    if (!profile?.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/auth/login?error=inactive', req.url));
    }
    
    // Rutas solo Admin/Super Admin
    if (ADMIN_ONLY_ROUTES.some(r => path.startsWith(r))) {
      if (!['super_admin', 'admin'].includes(profile?.role ?? '')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    
    // Rutas solo Super Admin
    if (SUPER_ADMIN_ROUTES.some(r => path.startsWith(r))) {
      if (profile?.role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    
    // Inyectar rol en headers para API Routes
    res.headers.set('x-user-role', profile?.role ?? 'viewer');
    res.headers.set('x-user-id', session.user.id);
  }
  
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
```

### 6.4 Verificación de Email en Registro

```typescript
// src/infrastructure/supabase/repositories/SupabaseUserRepository.ts

import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export class SupabaseUserRepository implements IUserRepository {
  
  async isEmailAllowed(email: string): Promise<{ allowed: boolean; role: UserRole }> {
    const { data, error } = await this.supabase
      .from('allowed_emails')
      .select('assigned_role, accepted_at')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !data) {
      return { allowed: false, role: 'viewer' };
    }
    
    return {
      allowed: true,
      role: data.assigned_role as UserRole,
    };
  }
  
  async createUser(input: CreateUserInput): Promise<User> {
    const { allowed, role } = await this.isEmailAllowed(input.email);
    
    if (!allowed) {
      throw new Error('Email no autorizado para crear cuenta');
    }
    
    // Asignar rol correcto al perfil
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('email', input.email)
      .select()
      .single();
    
    // Marcar como aceptado
    await this.supabase
      .from('allowed_emails')
      .update({ accepted_at: new Date().toISOString() })
      .eq('email', input.email);
    
    return this.mapToEntity(data);
  }
}
```

### 6.5 Hook de Autenticación (Frontend)

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();
  
  useEffect(() => {
    // Suscribirse a cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUser(profile);
        } else {
          setUser(null);
          if (event === 'SIGNED_OUT') {
            router.push('/auth/login');
          }
        }
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const signOut = () => supabase.auth.signOut();
  
  const isRole = (...roles: string[]) => 
    user ? roles.includes(user.role) : false;
  
  return { user, loading, signOut, isRole };
}
```

---

## 7. Pipeline de Procesamiento Excel

### 7.1 Flujo Completo

```
Usuario sube Excel (Archivo Maestro)
           ↓
  /api/upload/excel.ts
    - Validar tipo de archivo (.xlsx, .xls)
    - Validar tamaño (máx 10MB)
    - Subir a Supabase Storage (/uploads/{userId}/{year}/{filename})
    - Crear registro en file_uploads (status: 'pending')
    - Retornar upload_id
           ↓
  /api/upload/process.ts (background job)
    - Descargar archivo de Storage
    - Parsear con SheetJS
    - Mapear columnas a entidades de dominio
    - Insertar en budget_lines (upsert)
    - Actualizar file_uploads (status: 'completed')
    - Retornar resumen
           ↓
  Dashboard se actualiza (revalidación de caché)
```

### 7.2 Parser de Excel

```typescript
// src/infrastructure/excel/ExcelParser.ts
import * as XLSX from 'xlsx';

export interface RawBudgetRow {
  lineNumber: number;
  partida: string;
  description: string;
  responsible: string;
  category: 'A' | 'B';
  budgets: Record<number, number>; // mes → monto
}

export class ExcelParser {
  
  parse(buffer: Buffer): RawBudgetRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Hoja principal del archivo maestro
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: 1,
      defval: 0,
    });
    
    return this.mapRows(rows as unknown[][]);
  }
  
  private mapRows(rows: unknown[][]): RawBudgetRow[] {
    const HEADER_ROW = 2; // Fila 3 (índice 2) contiene encabezados
    const DATA_START = 3; // Datos desde fila 4
    
    const results: RawBudgetRow[] = [];
    
    for (let i = DATA_START; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      
      // Saltar filas vacías o de subtotales
      if (!row[1] || row[1] === 'TOTAL') continue;
      
      results.push({
        lineNumber: i - DATA_START + 1,
        partida: String(row[1] ?? ''),
        description: String(row[2] ?? ''),
        responsible: String(row[3] ?? ''),
        category: String(row[4] ?? 'B') as 'A' | 'B',
        budgets: {
          1:  Number(row[5]  ?? 0),  // Enero
          2:  Number(row[6]  ?? 0),  // Febrero
          3:  Number(row[7]  ?? 0),  // Marzo
          4:  Number(row[8]  ?? 0),  // Abril
          5:  Number(row[9]  ?? 0),  // Mayo
          6:  Number(row[10] ?? 0),  // Junio
          7:  Number(row[11] ?? 0),  // Julio
          8:  Number(row[12] ?? 0),  // Agosto
          9:  Number(row[13] ?? 0),  // Septiembre
          10: Number(row[14] ?? 0),  // Octubre
          11: Number(row[15] ?? 0),  // Noviembre
          12: Number(row[16] ?? 0),  // Diciembre
        },
      });
    }
    
    return results;
  }
}
```

### 7.3 API Route de Procesamiento

```typescript
// pages/api/upload/process.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { ExcelParser } from '../../../src/infrastructure/excel/ExcelParser';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = createServerSupabaseClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return res.status(401).json({ error: 'No autorizado' });
  
  // Verificar rol
  const userRole = req.headers['x-user-role'] as string;
  if (!['super_admin', 'admin'].includes(userRole)) {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }
  
  const { uploadId, costCenterId, year } = req.body;
  
  try {
    // 1. Actualizar estado a 'processing'
    await supabase
      .from('file_uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);
    
    // 2. Descargar archivo de Storage
    const { data: upload } = await supabase
      .from('file_uploads')
      .select('storage_path')
      .eq('id', uploadId)
      .single();
    
    const { data: fileData } = await supabase.storage
      .from('excel-uploads')
      .download(upload.storage_path);
    
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // 3. Parsear Excel
    const parser = new ExcelParser();
    const rows = parser.parse(buffer);
    
    // 4. Upsert en budget_lines
    const budgetLines = rows.map(row => ({
      upload_id:      uploadId,
      cost_center_id: costCenterId,
      year:           Number(year),
      line_number:    row.lineNumber,
      partida:        row.partida,
      description:    row.description,
      responsible:    row.responsible,
      category:       row.category,
      budget_jan:     row.budgets[1],
      budget_feb:     row.budgets[2],
      budget_mar:     row.budgets[3],
      budget_apr:     row.budgets[4],
      budget_may:     row.budgets[5],
      budget_jun:     row.budgets[6],
      budget_jul:     row.budgets[7],
      budget_aug:     row.budgets[8],
      budget_sep:     row.budgets[9],
      budget_oct:     row.budgets[10],
      budget_nov:     row.budgets[11],
      budget_dec:     row.budgets[12],
      total_annual:   Object.values(row.budgets).reduce((a, b) => a + b, 0),
    }));
    
    const { error: upsertError } = await supabase
      .from('budget_lines')
      .upsert(budgetLines, {
        onConflict: 'cost_center_id,year,line_number',
        ignoreDuplicates: false,
      });
    
    if (upsertError) throw upsertError;
    
    // 5. Actualizar estado a 'completed'
    await supabase
      .from('file_uploads')
      .update({
        status: 'completed',
        rows_processed: rows.length,
        processed_at: new Date().toISOString(),
      })
      .eq('id', uploadId);
    
    return res.status(200).json({
      success: true,
      rowsProcessed: rows.length,
    });
    
  } catch (error) {
    // Marcar como fallido
    await supabase
      .from('file_uploads')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Error desconocido',
      })
      .eq('id', uploadId);
    
    return res.status(500).json({ error: 'Error procesando archivo' });
  }
}
```

---

## 8. Módulo de Dashboard

### 8.1 Dashboard Anual (`/dashboard`)

Muestra el resumen de los 12 meses del año seleccionado:

```typescript
// pages/dashboard/index.tsx
import { GetServerSideProps } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

interface AnnualSummary {
  year: number;
  totalBudget: number;
  months: MonthSummary[];
  byPartida: PartidaSummary[];
  executionRate: number;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx);
  const year = ctx.query.year ? Number(ctx.query.year) : new Date().getFullYear();
  
  // Obtener presupuesto anual agrupado por partida
  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select(`
      partida,
      category,
      budget_jan, budget_feb, budget_mar, budget_apr,
      budget_may, budget_jun, budget_jul, budget_aug,
      budget_sep, budget_oct, budget_nov, budget_dec,
      total_annual
    `)
    .eq('year', year)
    .order('total_annual', { ascending: false });
  
  return {
    props: { budgetLines: budgetLines ?? [], year },
  };
};
```

### 8.2 Dashboard Mensual (`/dashboard/[year]/[month]`)

Replica y extiende el dashboard HTML actual con datos reales de Supabase.

**KPIs principales:**
- Presupuesto Total del mes
- Proyección de cierre
- Variación proyectada (S/ y %)
- Tasa de ejecución

**Secciones:**
- Distribución por Categoría A/B
- Análisis de reprogramaciones
- Tabla por responsable
- Consolidado por partidas presupuestales
- Exportar a Excel (consolidado GAF)

### 8.3 Selector de Mes

```typescript
// components/dashboard/MonthSelector.tsx
import { useRouter } from 'next/router';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function MonthSelector({ currentYear, currentMonth }: Props) {
  const router = useRouter();
  
  const navigate = (year: number, month: number) => {
    router.push(`/dashboard/${year}/${month}`);
  };
  
  return (
    <div className="flex gap-3 items-center">
      <Select
        value={String(currentYear)}
        onValueChange={(y) => navigate(Number(y), currentMonth)}
      >
        <SelectTrigger className="w-[100px]">
          {currentYear}
        </SelectTrigger>
        <SelectContent>
          {[2024, 2025, 2026, 2027].map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={String(currentMonth)}
        onValueChange={(m) => navigate(currentYear, Number(m))}
      >
        <SelectTrigger className="w-[140px]">
          {MONTHS[currentMonth - 1]}
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

---

## 9. Chatbot con IA — Mercury-2 + RAG

### 9.1 Arquitectura del Chatbot

```
Usuario escribe pregunta
         ↓
  POST /api/chat
         ↓
  1. Vectorizar pregunta (OpenAI embeddings)
         ↓
  2. Búsqueda semántica en kb_embeddings (pgvector)
         ↓
  3. Recuperar chunks más relevantes
         ↓
  4. Construir prompt con contexto RAG
         ↓
  5. Llamar Mercury-2 API con streaming
         ↓
  6. Stream respuesta al cliente
         ↓
  7. Guardar mensaje en chat_messages
```

### 9.2 Custom Provider para Mercury-2 (InceptionLabs)

Mercury-2 es un modelo de difusión que requiere un adaptador personalizado para el Vercel AI SDK:

```typescript
// src/infrastructure/ai/mercury/MercuryProvider.ts
import type { LanguageModelV1 } from '@ai-sdk/provider';

const INCEPTION_API_BASE = 'https://api.inceptionlabs.ai/v1';

export function createMercuryProvider(apiKey: string) {
  return {
    /**
     * Retorna un modelo Mercury-2 compatible con Vercel AI SDK
     * usando el protocolo OpenAI-compatible si InceptionLabs lo soporta,
     * o un adaptador personalizado en caso contrario.
     */
    chat(modelId: string = 'mercury-coder-small') {
      return new MercuryLanguageModel(modelId, apiKey);
    },
  };
}

class MercuryLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  readonly provider = 'inceptionlabs';
  readonly modelId: string;
  readonly defaultObjectGenerationMode = undefined;
  
  constructor(modelId: string, private apiKey: string) {
    this.modelId = modelId;
  }
  
  async doGenerate(options: LanguageModelV1CallOptions) {
    const response = await fetch(`${INCEPTION_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        messages: options.prompt,
        stream: false,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
      }),
    });
    
    const data = await response.json();
    
    return {
      text: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      },
      finishReason: data.choices[0].finish_reason,
      rawCall: { rawPrompt: options.prompt, rawSettings: {} },
    };
  }
  
  async doStream(options: LanguageModelV1CallOptions) {
    const response = await fetch(`${INCEPTION_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        messages: options.prompt,
        stream: true,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
      }),
    });
    
    // Transformar SSE stream al formato de Vercel AI SDK
    return {
      stream: response.body!.pipeThrough(new MercuryStreamTransformer()),
      rawCall: { rawPrompt: options.prompt, rawSettings: {} },
    };
  }
}
```

### 9.3 API Route del Chat con Streaming + RAG

```typescript
// pages/api/chat/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { StreamingTextResponse, streamText } from 'ai';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { createMercuryProvider } from '../../../src/infrastructure/ai/mercury/MercuryProvider';
import { OpenAIEmbedder } from '../../../src/infrastructure/ai/embeddings/OpenAIEmbedder';
import { kv } from '@vercel/kv';

export const config = { runtime: 'nodejs' };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const supabase = createServerSupabaseClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return res.status(401).end();
  
  const { messages, sessionId } = req.body as {
    messages: Array<{ role: string; content: string }>;
    sessionId: string;
  };
  
  const userMessage = messages[messages.length - 1].content;
  
  // 1. Vectorizar la pregunta del usuario
  const embedder = new OpenAIEmbedder(process.env.OPENAI_API_KEY!);
  const queryEmbedding = await embedder.embed(userMessage);
  
  // 2. Buscar contexto relevante en la KB (RAG)
  const { data: relevantChunks } = await supabase.rpc('search_kb', {
    query_embedding: queryEmbedding,
    match_count: 5,
    similarity_threshold: 0.65,
  });
  
  // 3. Construir contexto RAG
  const ragContext = relevantChunks?.length
    ? `\n\nCONTEXTO RELEVANTE:\n${relevantChunks
        .map((c: any) => `[${c.category.toUpperCase()}] ${c.title}:\n${c.chunk_text}`)
        .join('\n\n')}`
    : '';
  
  // 4. System prompt con contexto presupuestal
  const systemPrompt = `Eres PresupAI, el asistente de control presupuestal de CRP Radios.
Ayudas a analizar el presupuesto del Centro de Costo CC231, interpretar ejecuciones,
reprogramaciones, ahorros y partidas presupuestales.

Respondes de forma clara, concisa y en español peruano.
Si no tienes información suficiente, lo dices claramente.
No inventas datos numéricos.${ragContext}`;
  
  // 5. Inicializar Mercury-2
  const mercury = createMercuryProvider(process.env.INCEPTION_API_KEY!);
  const model = mercury.chat('mercury-coder-small');
  
  // 6. Streaming con Vercel AI SDK
  const result = await streamText({
    model,
    system: systemPrompt,
    messages: messages as any,
    maxTokens: 1024,
    temperature: 0.7,
  });
  
  // 7. Guardar en historial (no-blocking)
  supabase.from('chat_messages').insert([
    { session_id: sessionId, role: 'user', content: userMessage },
  ]).then(() => {
    result.text.then(text => {
      supabase.from('chat_messages').insert([
        {
          session_id: sessionId,
          role: 'assistant',
          content: text,
          metadata: { rag_chunks: relevantChunks?.map((c: any) => c.document_id) },
        },
      ]);
    });
  });
  
  return result.toTextStreamResponse();
}
```

### 9.4 Hook del Chatbot (Frontend)

```typescript
// hooks/useChat.ts
import { useChat as useAIChat } from 'ai/react';
import { useState } from 'react';

export function usePresupChat(sessionId: string) {
  const [isOpen, setIsOpen] = useState(false);
  
  const chat = useAIChat({
    api: '/api/chat',
    body: { sessionId },
    initialMessages: [],
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });
  
  return {
    ...chat,
    isOpen,
    togglePanel: () => setIsOpen(prev => !prev),
  };
}
```

### 9.5 Componente ChatPanel

```typescript
// components/chat/ChatPanel.tsx
'use client';
import { usePresupChat } from '../../hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { Button } from '../ui/button';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ChatPanel({ sessionId }: { sessionId: string }) {
  const {
    messages, input, handleInputChange, handleSubmit,
    isLoading, isOpen, togglePanel,
  } = usePresupChat(sessionId);
  
  return (
    <>
      {/* Botón flotante */}
      <Button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
        size="icon"
      >
        {isOpen ? <X /> : <MessageCircle />}
      </Button>
      
      {/* Panel del chat */}
      <div className={cn(
        'fixed bottom-24 right-6 w-[380px] h-[520px] z-40',
        'bg-white rounded-2xl shadow-2xl border flex flex-col',
        'transition-all duration-300',
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-green-600 to-green-700 rounded-t-2xl">
          <h3 className="text-white font-semibold">PresupAI Assistant</h3>
          <p className="text-green-100 text-xs">Powered by Mercury-2</p>
        </div>
        
        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-8">
              Pregúntame sobre el presupuesto CC231 📊
            </p>
          )}
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
        </div>
        
        {/* Input */}
        <div className="p-3 border-t">
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            disabled={isLoading}
          />
        </div>
      </div>
    </>
  );
}
```

---

## 10. Gestión de Contexto del Chatbot

### 10.1 Decisión de Arquitectura: ¿Payload CMS o Solución Integrada?

> **Análisis de Opciones:**

#### Opción A — Payload CMS (evaluada y descartada para este caso)

**Pros:** UI de gestión de contenido out-of-the-box, control de versiones, flujo editorial.  
**Contras:**
- Requiere deployment separado o embedded en Next.js (App Router nativo; Page Router con adaptaciones)
- Añade ~200MB de dependencias adicionales
- Complejidad operacional innecesaria para el volumen de contenido de este sistema
- La integración con pgvector requiere desarrollo adicional de todas formas

#### Opción B — Módulo KB Integrado en el SaaS ✅ RECOMENDADA

**Solución:** Un panel de administración KB dentro del mismo SaaS con CRUD de documentos + re-embedding automático.

**Pros:**
- Stack único (Next.js + Supabase), sin infraestructura extra
- El admin puede editar FAQs directamente desde la plataforma
- Re-embedding automático al guardar cambios (con caché Vercel KV)
- Control de versiones básico incluido en el schema
- Menor superficie de ataque de seguridad

**Flujo de actualización del contexto:**

```
Admin edita documento en /admin/knowledge-base
           ↓
  PATCH /api/chat/kb/{id}
    - Actualizar kb_documents
    - Disparar re-embedding (chunking + vectorización)
    - Invalidar caché Vercel KV
    - Guardar nuevos vectores en kb_embeddings
           ↓
  Chatbot usa contexto actualizado en siguiente consulta
```

### 10.2 Estrategia de Chunking y Embedding

```typescript
// src/application/services/EmbeddingService.ts
import { OpenAIEmbedder } from '../../infrastructure/ai/embeddings/OpenAIEmbedder';
import { kv } from '@vercel/kv';

export class EmbeddingService {
  private embedder: OpenAIEmbedder;
  private CACHE_TTL = 60 * 60 * 24; // 24 horas
  
  constructor() {
    this.embedder = new OpenAIEmbedder(process.env.OPENAI_API_KEY!);
  }
  
  /**
   * Divide el texto en chunks semánticos con overlap
   */
  chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) chunks.push(chunk.trim());
    }
    
    return chunks;
  }
  
  /**
   * Vectoriza un documento KB completo y retorna los embeddings por chunk
   */
  async embedDocument(documentId: string, content: string): Promise<
    Array<{ chunkIndex: number; chunkText: string; embedding: number[] }>
  > {
    const cacheKey = `embedding:${documentId}`;
    
    // Intentar desde caché
    const cached = await kv.get<any[]>(cacheKey);
    if (cached) return cached;
    
    const chunks = this.chunkText(content);
    const embeddings = await Promise.all(
      chunks.map(chunk => this.embedder.embed(chunk))
    );
    
    const result = chunks.map((chunk, i) => ({
      chunkIndex: i,
      chunkText: chunk,
      embedding: embeddings[i],
    }));
    
    // Guardar en caché
    await kv.set(cacheKey, result, { ex: this.CACHE_TTL });
    
    return result;
  }
  
  /**
   * Invalida el caché de un documento al actualizarse
   */
  async invalidateDocumentCache(documentId: string): Promise<void> {
    await kv.del(`embedding:${documentId}`);
  }
}
```

### 10.3 API Route de Re-embedding

```typescript
// pages/api/chat/kb/embed.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { EmbeddingService } from '../../../../src/application/services/EmbeddingService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const supabase = createServerSupabaseClient({ req, res });
  const role = req.headers['x-user-role'] as string;
  
  if (!['super_admin', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }
  
  const { documentId } = req.body;
  
  // Obtener documento
  const { data: doc } = await supabase
    .from('kb_documents')
    .select('id, content')
    .eq('id', documentId)
    .single();
  
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
  
  const embeddingService = new EmbeddingService();
  
  // Invalidar caché anterior
  await embeddingService.invalidateDocumentCache(documentId);
  
  // Re-vectorizar
  const embeddings = await embeddingService.embedDocument(documentId, doc.content);
  
  // Eliminar embeddings anteriores y reemplazar
  await supabase
    .from('kb_embeddings')
    .delete()
    .eq('document_id', documentId);
  
  await supabase.from('kb_embeddings').insert(
    embeddings.map(e => ({
      document_id: documentId,
      chunk_index: e.chunkIndex,
      chunk_text: e.chunkText,
      embedding: e.embedding,
    }))
  );
  
  return res.status(200).json({
    success: true,
    chunksGenerated: embeddings.length,
  });
}
```

### 10.4 Interfaz de Gestión KB (Admin)

```typescript
// pages/admin/knowledge-base.tsx
// Panel donde admin puede:
// - Ver lista de documentos del KB
// - Crear nuevo documento (FAQs, procesos, definiciones)
// - Editar contenido con textarea enriquecida
// - Ver última fecha de re-embedding
// - Disparar re-embedding manual
// - Activar/desactivar documentos
// - Categorizar: faq | process | definition | context | policy
```

**Categorías del KB recomendadas para CRP:**
- `faq`: Preguntas frecuentes del presupuesto
- `process`: Proceso mensual de control presupuestal
- `definition`: Definiciones (Categoría A, B, Reprogramación, etc.)
- `context`: Contexto del Archivo Maestro y estructura Excel
- `policy`: Políticas de aprobación y límites

---

## 11. Diseño de API (Page Router)

### 11.1 Mapa de Endpoints

```
GET    /api/budget                         → Resumen general (todos los años)
GET    /api/budget/:year                   → Resumen anual
GET    /api/budget/:year/:month            → Detalle mensual
GET    /api/budget/export                  → Export Excel consolidado GAF

POST   /api/upload/excel                   → Upload archivo Excel a Storage
POST   /api/upload/process                 → Procesar Excel en BD

GET    /api/admin/users                    → Listar usuarios
POST   /api/admin/users                    → Crear usuario (agregar email)
PATCH  /api/admin/users/:id               → Actualizar rol
DELETE /api/admin/users/:id               → Desactivar usuario

GET    /api/admin/allowed-emails           → Listar correos permitidos
POST   /api/admin/allowed-emails           → Agregar correo permitido
DELETE /api/admin/allowed-emails/:id       → Eliminar correo

GET    /api/chat/sessions                  → Historial de sesiones
POST   /api/chat/sessions                  → Nueva sesión
POST   /api/chat                           → Enviar mensaje (streaming)

GET    /api/chat/kb                        → Listar documentos KB
POST   /api/chat/kb                        → Crear documento KB
PATCH  /api/chat/kb/:id                   → Actualizar documento
DELETE /api/chat/kb/:id                   → Eliminar documento
POST   /api/chat/kb/embed                  → Re-vectorizar documento
```

### 11.2 Patrón de Respuesta Estándar

```typescript
// types/api.ts

// Respuesta exitosa
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

// Respuesta de error
interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

### 11.3 Middleware de Autenticación API (HOF)

```typescript
// lib/api-middleware.ts
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

type Role = 'super_admin' | 'admin' | 'analyst' | 'viewer';

export function withAuth(handler: NextApiHandler, allowedRoles?: Role[]) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    
    if (allowedRoles?.length) {
      const role = req.headers['x-user-role'] as string;
      if (!allowedRoles.includes(role as Role)) {
        return res.status(403).json({ success: false, error: 'Sin permisos' });
      }
    }
    
    return handler(req, res);
  };
}

// Uso en API routes:
// export default withAuth(handler, ['super_admin', 'admin']);
```

---

## 12. Sistema de UI — Tailwind + Shadcn/UI

### 12.1 Configuración Tailwind

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colores corporativos CRP Radios
        brand: {
          50:  '#f0fdf0',
          100: '#dcfce7',
          500: '#3fac2b',  // Verde CRP principal
          600: '#2d8a1f',
          700: '#1f6b14',
          900: '#14431c',
        },
        // Shadcn/UI CSS vars
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### 12.2 Componentes Shadcn/UI a instalar

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge table dialog
npx shadcn-ui@latest add select input label textarea
npx shadcn-ui@latest add progress separator toast
npx shadcn-ui@latest add dropdown-menu avatar tooltip
npx shadcn-ui@latest add form alert skeleton
```

### 12.3 KPICard Component

```typescript
// components/dashboard/KPICard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

export function KPICard({ title, value, subValue, variant = 'default', icon }: KPICardProps) {
  const valueColors = {
    default: 'text-slate-900',
    success: 'text-green-600',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  };
  
  return (
    <Card className="hover:-translate-y-1 transition-transform duration-200 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold', valueColors[variant])}>
          {value}
        </div>
        {subValue && (
          <p className="text-sm text-slate-500 mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 13. Seguridad

### 13.1 Checklist de Seguridad

- ✅ **RLS en todas las tablas**: Usuarios solo acceden a datos de sus CCs asignados
- ✅ **JWT validation**: Supabase verifica tokens en cada request API
- ✅ **Lista blanca de emails**: Solo correos aprobados por super_admin pueden registrarse
- ✅ **Role-based access**: Middleware valida roles en rutas protegidas
- ✅ **Input validation**: Zod schemas en todas las API routes
- ✅ **File upload validation**: Solo `.xlsx` / `.xls`, máximo 10MB
- ✅ **API Key secrets**: Todas las API keys solo en variables de entorno server-side
- ✅ **Rate limiting**: Vercel Edge Middleware para limitar requests al chat
- ✅ **CSRF protection**: Next.js tiene protección CSRF nativa en API routes
- ✅ **Content Security Policy**: Headers configurados en next.config.js

### 13.2 Headers de Seguridad

```javascript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.supabase.co https://api.inceptionlabs.ai",
    ].join('; '),
  },
];

module.exports = {
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ];
  },
};
```

### 13.3 Validación con Zod

```typescript
// lib/validations.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'analyst', 'viewer']),
});

export const uploadExcelSchema = z.object({
  costCenterId: z.string().uuid(),
  year: z.number().int().min(2020).max(2030),
});

export const kbDocumentSchema = z.object({
  title: z.string().min(3).max(255),
  content: z.string().min(10),
  category: z.enum(['faq', 'process', 'definition', 'context', 'policy']),
  tags: z.array(z.string()).optional(),
});
```

---

## 14. Rendimiento y Caché

### 14.1 Estrategia de Caché por Nivel

| Nivel | Tecnología | TTL | Uso |
|---|---|---|---|
| **Edge Cache** | Vercel CDN | 1 min | Assets estáticos |
| **Server Cache** | Next.js `unstable_cache` | 5 min | Datos del dashboard |
| **Redis Cache** | Vercel KV | 24 h | Embeddings KB vectorizados |
| **Client Cache** | React Query / SWR | 30 s | Data del usuario actual |

### 14.2 Cache de Dashboard con SWR

```typescript
// hooks/useBudget.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useMonthlyBudget(year: number, month: number) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/budget/${year}/${month}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000, // 30s
    }
  );
  
  return {
    budget: data?.data,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
```

### 14.3 Invalidación de Caché tras Upload

```typescript
// Tras procesar Excel exitosamente:
// Invalidar cache SWR del cliente via mutate global
// Invalidar KV cache de embeddings si se actualizó contexto
```

---

## 15. Variables de Entorno

```bash
# .env.local (NO incluir en control de versiones)

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...    # Solo server-side, NUNCA exponer

# === IA — InceptionLabs Mercury-2 ===
INCEPTION_API_KEY=sk-inception-...
INCEPTION_API_BASE_URL=https://api.inceptionlabs.ai/v1
MERCURY_MODEL_ID=mercury-coder-small

# === IA — OpenAI (solo para embeddings) ===
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# === Vercel KV (Redis) ===
KV_REST_API_URL=https://....kv.vercel-storage.com
KV_REST_API_TOKEN=AX...

# === App Config ===
NEXT_PUBLIC_APP_URL=https://presupai.vercel.app
NEXT_PUBLIC_APP_NAME=PresupAI
NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB=10

# === Supabase Storage ===
SUPABASE_STORAGE_BUCKET=excel-uploads
```

---

## 16. Estrategia de Deployment

### 16.1 Infraestructura en Producción

```
Vercel (Next.js)
├── Edge Middleware → Auth check
├── Serverless Functions → API Routes
├── Static Assets → CDN
└── Cron Jobs (opcional) → Vercel Cron

Supabase (Managed PostgreSQL)
├── Database → tablas + RLS
├── Auth → JWT management
├── Storage → archivos Excel
└── pgvector → embeddings RAG

Vercel KV → Redis (caché embeddings)

InceptionLabs API → Mercury-2
OpenAI API → Embeddings
```

### 16.2 CI/CD con GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 16.3 Checklist Pre-Deploy

- [ ] Variables de entorno configuradas en Vercel Dashboard
- [ ] Migraciones SQL ejecutadas en Supabase
- [ ] RLS policies habilitadas y testeadas
- [ ] Supabase Storage bucket `excel-uploads` creado con políticas correctas
- [ ] Vercel KV instance creada y conectada al proyecto
- [ ] DNS configurado si se usa dominio personalizado
- [ ] pgvector extension habilitada en Supabase
- [ ] Al menos un usuario `super_admin` creado manualmente en la base de datos

---

## 17. Guía de Desarrollo Local

### 17.1 Setup Inicial

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-org/presupai.git
cd presupai

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 4. Inicializar Shadcn/UI
npx shadcn-ui@latest init

# 5. Instalar componentes Shadcn necesarios
npx shadcn-ui@latest add button card badge table dialog select \
  input label textarea progress separator toast dropdown-menu \
  avatar tooltip form alert skeleton

# 6. Ejecutar migraciones en Supabase
# (desde Supabase Studio → SQL Editor, ejecutar los scripts de la sección 5)

# 7. Iniciar servidor de desarrollo
npm run dev
```

### 17.2 Scripts de Package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "generate:types": "supabase gen types typescript --project-id $PROJECT_ID > types/supabase.ts",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset"
  }
}
```

### 17.3 Dependencias Principales

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "@supabase/auth-helpers-nextjs": "^0.9.0",
    "@supabase/supabase-js": "^2.43.0",
    "ai": "^3.2.0",
    "xlsx": "^0.18.5",
    "swr": "^2.2.5",
    "zod": "^3.23.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "lucide-react": "^0.383.0",
    "@vercel/kv": "^2.0.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

---

## 18. Estrategia de Testing

### 18.1 Pirámide de Testing

```
         /\
        /E2E\          → Playwright (flujos críticos)
       /──────\
      / Integr \       → Jest + Testing Library (páginas y APIs)
     /──────────\
    /   Unitario \     → Jest (entities, use cases, parsers)
   /______________\
```

### 18.2 Tests Unitarios — Ejemplos

```typescript
// src/domain/value-objects/__tests__/Money.test.ts
import { Money } from '../Money';

describe('Money Value Object', () => {
  it('debe formatear correctamente en soles peruanos', () => {
    const money = new Money(1234.56);
    expect(money.format()).toBe('S/ 1,234.56');
  });
  
  it('debe rechazar valores negativos', () => {
    expect(() => new Money(-100)).toThrow('El monto no puede ser negativo');
  });
  
  it('debe calcular porcentaje de ejecución', () => {
    const budget = new Money(100000);
    const executed = new Money(85000);
    expect(executed.percentageOf(budget)).toBe(85);
  });
});
```

```typescript
// src/infrastructure/excel/__tests__/ExcelParser.test.ts
import { ExcelParser } from '../ExcelParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ExcelParser', () => {
  const parser = new ExcelParser();
  
  it('debe parsear el archivo maestro correctamente', () => {
    const buffer = readFileSync(join(__dirname, 'fixtures/archivo_maestro_test.xlsx'));
    const rows = parser.parse(buffer);
    
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({
      partida: expect.any(String),
      category: expect.stringMatching(/^[AB]$/),
      budgets: expect.objectContaining({ 1: expect.any(Number) }),
    });
  });
});
```

### 18.3 Tests E2E con Playwright

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test('debe redirigir a login si no hay sesión', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/auth/login');
  });
  
  test('debe bloquear emails no autorizados', async ({ page }) => {
    await page.goto('/auth/login');
    // ...flujo de intento de registro con email no autorizado
    await expect(page.getByText('Email no autorizado')).toBeVisible();
  });
});
```

---

## 19. Roadmap de Funcionalidades

### Sprint 1 (Semanas 1-2) — Fundación
- [ ] Setup del proyecto (Next.js, Tailwind, Shadcn, TypeScript)
- [ ] Configuración Supabase (schema, RLS, Storage)
- [ ] Sistema de autenticación + lista blanca de emails
- [ ] Panel de administración básico (gestión de usuarios)
- [ ] Middleware de roles

### Sprint 2 (Semanas 3-4) — Upload y Dashboard
- [ ] Upload de Archivo Maestro Excel
- [ ] Pipeline de procesamiento (parser + insert en BD)
- [ ] Dashboard anual (KPIs + tabla)
- [ ] Dashboard mensual (reemplaza HTML actual)
- [ ] Selector de mes/año
- [ ] Exportar Excel consolidado GAF

### Sprint 3 (Semanas 5-6) — Chatbot IA
- [ ] Custom provider Mercury-2
- [ ] RAG pipeline (embeddings + búsqueda semántica)
- [ ] API de chat con streaming
- [ ] ChatPanel UI (Vercel AI SDK `useChat`)
- [ ] Historial de conversaciones

### Sprint 4 (Semanas 7-8) — Knowledge Base + Pulido
- [ ] Panel de gestión KB (CRUD documentos)
- [ ] Re-embedding automático con Vercel KV
- [ ] Importación de FAQs desde Excel de seguimiento
- [ ] Refinamiento de UI/UX
- [ ] Testing (unit + integration + E2E)
- [ ] Deployment en Vercel

### Futuras Mejoras (Post-MVP)
- [ ] Notificaciones (email/Slack) cuando ejecución supera umbral
- [ ] Forecast automático con ML
- [ ] Comparativa YTD (Year-to-Date)
- [ ] Multi-tenant (múltiples empresas/CCs)
- [ ] Dashboard mobile-first con PWA
- [ ] Integración directa con ERP

---

## Notas Finales

### Consideraciones sobre Mercury-2

Mercury-2 de InceptionLabs es un modelo de difusión LLM con características únicas frente a modelos auto-regresivos. Puntos a tener en cuenta:

1. **API Compatibility**: Verificar si InceptionLabs provee endpoint compatible con OpenAI API format. De ser así, se puede usar `@ai-sdk/openai` con `baseURL` personalizado, simplificando la implementación.

2. **Streaming**: Los modelos de difusión pueden tener diferente comportamiento de streaming. El adaptador custom deberá manejar el formato SSE específico de InceptionLabs.

3. **Latencia**: Los modelos de difusión suelen tener menor latencia en generación, lo que mejorará la experiencia del chatbot.

4. **Alternativa de emergencia**: Si la API de Mercury-2 no soporta streaming estándar durante desarrollo, usar `@ai-sdk/openai` con `gpt-4o-mini` como fallback temporal hasta confirmar compatibilidad.

### Por qué NO usar Payload CMS

Para este proyecto específico, Payload CMS agrega complejidad sin beneficio proporcional:
- El volumen de contenido del KB es manejable con CRUD simple
- No se necesita flujo editorial complejo
- Mantener un solo stack (Next.js + Supabase) reduce la deuda técnica
- La UI de gestión KB puede construirse en 2-3 componentes simples

Si en el futuro el equipo necesita un CMS completo para gestión de contenido editorial (artículos, newsletters, etc.), se puede integrar Payload CMS en ese momento de forma modular.

---

*Documento generado: Abril 2026 | PresupAI v1.0.0 | Arquitectura: Clean Code + Next.js Page Router*