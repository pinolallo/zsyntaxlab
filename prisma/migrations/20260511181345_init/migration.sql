-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "PaperStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'ANALYZING', 'EXTRACTING', 'TRANSLATING', 'INFERRING', 'VECTORIZING', 'DONE', 'ERROR');

-- CreateEnum
CREATE TYPE "FormulaType" AS ENUM ('EVF', 'LVF', 'THEOREM');

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "papers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "doi" TEXT,
    "year" INTEGER,
    "raw_path" TEXT,
    "url" TEXT,
    "abstract" TEXT,
    "status" "PaperStatus" NOT NULL DEFAULT 'PENDING',
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zsyntax_formulae" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "type" "FormulaType" NOT NULL,
    "formula" TEXT NOT NULL,
    "molecules" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source_text" TEXT,
    "metadata" JSONB,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zsyntax_formulae_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theorems" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "derivation_chain" TEXT[],
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "summary" TEXT,
    "reasoning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theorems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theorem_formulae" (
    "theorem_id" TEXT NOT NULL,
    "formula_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "theorem_formulae_pkey" PRIMARY KEY ("theorem_id","formula_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "papers_doi_key" ON "papers"("doi");

-- AddForeignKey
ALTER TABLE "zsyntax_formulae" ADD CONSTRAINT "zsyntax_formulae_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theorems" ADD CONSTRAINT "theorems_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theorem_formulae" ADD CONSTRAINT "theorem_formulae_theorem_id_fkey" FOREIGN KEY ("theorem_id") REFERENCES "theorems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theorem_formulae" ADD CONSTRAINT "theorem_formulae_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "zsyntax_formulae"("id") ON DELETE CASCADE ON UPDATE CASCADE;
