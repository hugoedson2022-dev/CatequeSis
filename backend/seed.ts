import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cadastrando as turmas...');

  // Limpa ou insere as turmas padrão da ata
  const turmas = [
    { nome: 'QUINTA 1', diaSemana: 'Quinta-feira' },
    { nome: 'QUINTA 2', diaSemana: 'Quinta-feira' },
    { nome: 'SÁBADO 1', diaSemana: 'Sábado' },
    { nome: 'SÁBADO 2', diaSemana: 'Sábado' },
    { nome: 'DOMINGO 1', diaSemana: 'Domingo' },
    { nome: 'DOMINGO 2', diaSemana: 'Domingo' },
  ];

  for (const turma of turmas) {
    const existe = await prisma.turma.findFirst({
      where: { nome: turma.nome },
    });

    if (!existe) {
      await prisma.turma.create({
        data: turma,
      });
      console.log(`✔️ Turma cadastrada: ${turma.nome}`);
    } else {
      console.log(`ℹ️ Turma já existe: ${turma.nome}`);
    }
  }

  console.log('🚀 Processo finalizado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });