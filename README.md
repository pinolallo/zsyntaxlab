# ZsyntaxLab

**Molecular biology theorem discovery via AI and Zsyntax formal language.**

ZsyntaxLab reads biomolecular papers, translates molecular reactions into the [Zsyntax](https://doi.org/10.1371/journal.pone.0009511) formal language (Boniolo, D'Agostino, Di Fiore — PLoS ONE 2010), stores them in a vector database, and uses AI abduction to infer new predicted reactions as **theorems**.

---

## What is Zsyntax?

Zsyntax is a formal language for molecular biology based on substructural (non-classical) logic. Every reaction in the literature can be expressed as a logical formula:

| Operator | Name | Meaning | Example |
|---|---|---|---|
| `*` | Z-interaction | A physically interacts with B. **Not associative**: (A\*B)\*C ≠ A\*(B\*C) | `MDM2*TP53` |
| `&` | Z-conjunction | Aggregate/multiset of molecules. Fully associative, **not idempotent** (stoichiometry) | `MDM2&TP53` |
| `→` | Z-conditional | Transition/reaction from aggregate A to B | `MDM2&TP53 → MDM2*TP53` |

Two formula types:
- **EVF** *(Empirically Valid Formula)*: directly extracted from lab-confirmed papers
- **Theorem**: inferred by chaining EVFs via abduction — predicted reactions not yet published

The goal is to treat molecular biology as a collection of **theorems** in a deductive system, enabling AI-powered biological prediction.

---

## Features

- **Paper search** — find biomolecular papers via Brave Search API
- **PDF ingestion** — download and store papers locally
- **AI analysis pipeline** — 5-stage pipeline with live progress streaming (SSE):
  1. PDF text extraction & chunking
  2. Molecular reaction identification (LLM)
  3. Zsyntax EVF translation (LLM)
  4. Theorem inference via abduction (LLM)
  5. Vector embedding for semantic search
- **Theorem explorer** — browse EVFs and theorems, semantic vector search
- **Knowledge graph** — interactive Cytoscape.js visualization of the molecular reaction network (EVF edges solid, theorem edges dashed)
- **Admin panel** — configure API keys, model, groups, storage path — all stored in DB
- **Group-based auth** — UserHub authentication with `zsyntax_admin` and `zsyntax_user` groups

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Auth | UserHub External API + iron-session |
| Database | PostgreSQL + Prisma 7 + pgvector |
| AI / LLM | OpenRouter (configurable model) |
| Embeddings | OpenAI / Voyage AI / Ollama (configurable) |
| Paper search | Brave Search API |
| PDF parsing | pdf-parse |
| Graph | Cytoscape.js + cytoscape-dagre |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL with the `pgvector` extension

  **Option A — Supabase free tier (recommended, zero setup):**
  Create a project at [supabase.com](https://supabase.com). pgvector is pre-installed. Copy the connection string from **Settings → Database → Connection string (URI)**.

  **Option B — Local PostgreSQL:**
  ```bash
  brew install postgresql@16
  brew services start postgresql@16
  psql -c "CREATE DATABASE zsyntax;"
  psql zsyntax -c "CREATE EXTENSION IF NOT EXISTS vector;"
  ```

### Installation

```bash
git clone https://github.com/pinolallo/zsyntaxlab.git
cd zsyntaxlab
npm install
```

### Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Required
DATABASE_URL="postgresql://..."        # Supabase or local Postgres
USERHUB_URL="https://..."              # Your UserHub instance
USERHUB_API_KEY="..."
IRON_SESSION_SECRET="..."              # Min 32 characters

# Embeddings (choose one)
EMBEDDING_PROVIDER="openai"            # openai | voyage | ollama
OPENAI_API_KEY="sk-..."                # For OpenAI embeddings

# Configured via /admin panel (or as env fallback)
OPENROUTER_API_KEY="sk-or-..."
BRAVE_KEY="..."
```

### Database setup

```bash
npx prisma migrate dev
```

### Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Usage

1. **Sign in** with a UserHub account that belongs to `zsyntax_admin` or `zsyntax_user`
2. **Admin panel** (`/admin`) — set your OpenRouter API key and model, Brave Search key, embedding provider
3. **Papers** (`/papers`) — search for biomolecular papers and download PDFs
4. **Analyze** (`/analyze`) — select a downloaded paper and run the 5-stage AI pipeline
5. **Theorems** (`/theorems`) — browse extracted EVFs and predicted theorems; use semantic search to find reactions involving specific molecules
6. **Graph** (`/graph`) — explore the molecular reaction network interactively

---

## Project Structure

```
zsyntax/
├── app/
│   ├── admin/              Admin settings panel
│   ├── analyze/            Pipeline progress UI (SSE)
│   ├── graph/              Cytoscape knowledge graph
│   ├── papers/             Paper search + download
│   ├── theorems/           EVF + theorem explorer
│   └── api/                REST + SSE endpoints
├── lib/
│   ├── settings.ts         DB settings with 60s cache + env fallback
│   ├── userhub.ts          UserHub auth + group resolution
│   ├── openrouter.ts       LLM client + embedding providers
│   ├── brave.ts            Paper search + PDF download
│   ├── pdf.ts              Text extraction + chunking
│   ├── vector.ts           pgvector similarity search
│   └── zsyntax/
│       ├── parser.ts       Formula validator + normalizer
│       ├── extractor.ts    Paper → EVFs (LLM pipeline)
│       ├── theorems.ts     EVF chaining + abduction
│       └── pipeline.ts     Full async analysis pipeline
├── components/
│   ├── Nav.tsx             Navigation bar
│   └── FormulaCard.tsx     Syntax-highlighted Zsyntax formula
├── prisma/schema.prisma    DB schema (papers, formulae, theorems, settings)
├── middleware.ts            Route protection + admin group check
└── .env.example
```

---

## Auth Groups

| Group | Access |
|---|---|
| `zsyntax_admin` | All pages including `/admin` settings |
| `zsyntax_user` | All pages except `/admin` |

Group names are configurable from the admin panel.

---

## Zsyntax Reference

Based on: **Boniolo G, D'Agostino M, Di Fiore PP** (2010). *Zsyntax: A Formal Language for Molecular Biology with Projected Applications in Text Mining and Biological Prediction.* PLoS ONE 5(3): e9511. [doi:10.1371/journal.pone.0009511](https://doi.org/10.1371/journal.pone.0009511)

### Example EVFs

```
# Protein binding
MDM2 & TP53 → MDM2*TP53

# Gene activation by transcription factor
MDM2*TP53 → MDM2

# Enzymatic phosphorylation
CK1 * TP53 → phospho_TP53_Thr18

# Inferred theorem (abduction)
# If MDM2&TP53 → MDM2*TP53  AND  MDM2*TP53 → ubiquitin_TP53
# THEN theorem: MDM2&TP53 → ubiquitin_TP53
```

---

## License

MIT
