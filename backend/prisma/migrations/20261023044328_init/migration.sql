-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "diaSemana" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Catequisando" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nomeCompleto" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    CONSTRAINT "Catequisando_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Encontro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fase" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    CONSTRAINT "Encontro_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Presenca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encontroId" TEXT NOT NULL,
    "catequisandoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'P',
    CONSTRAINT "Presenca_encontroId_fkey" FOREIGN KEY ("encontroId") REFERENCES "Encontro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Presenca_catequisandoId_fkey" FOREIGN KEY ("catequisandoId") REFERENCES "Catequisando" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Presenca_encontroId_catequisandoId_key" ON "Presenca"("encontroId", "catequisandoId");
