import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Função auxiliar para polir e formatar a planilha idêntica à ata oficial
const formatarSheetAta = (sheet: ExcelJS.Worksheet, encontrosCount: number) => {
  // 1. Estilizar a linha do cabeçalho (Linha 1)
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1F4E78' }, // Azul institucional elegante
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 30;

  // 2. Definir largura automática e limpa das colunas
  sheet.columns = [
    { width: 6 },   // Nº
    { width: 8 },   // Etapa
    { width: 35 },  // Nome Completo (largo para caber perfeitamente)
    { width: 14 },  // Faltas Pré
    { width: 14 },  // Faltas Catecumenato
    { width: 18 },  // Status Aptidão
    ...Array(encontrosCount).fill({ width: 12 }) // Colunas dos encontros
  ];

  // 3. Formatar e alinhar as linhas de dados dos alunos
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Alinha o nome do catequisando à esquerda para facilitar a leitura
      const cellNome = row.getCell(3);
      if (cellNome) {
        cellNome.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Destaca visualmente o status de Aptidão (Verde para APTO, Vermelho para NÃO APTO)
      const cellAptidao = row.getCell(6);
      if (cellAptidao && cellAptidao.value === 'NÃO APTO') {
        cellAptidao.font = { bold: true, color: { argb: '9C0006' } };
        cellAptidao.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
      } else if (cellAptidao && cellAptidao.value === 'APTO') {
        cellAptidao.font = { bold: true, color: { argb: '006100' } };
        cellAptidao.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
      }
    }
  });
};

// 1. Rota para cadastrar uma Turma
app.post('/api/turmas', async (req, res) => {
  try {
    const { nome, diaSemana } = req.body;
    const turma = await prisma.turma.create({
      data: { nome, diaSemana },
    });
    return res.status(201).json(turma);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar turma' });
  }
});

// 2. Rota para listar todas as Turmas cadastradas com seus alunos
app.get('/api/turmas', async (req, res) => {
  try {
    const turmas = await prisma.turma.findMany({
      include: { catequisandos: true },
    });
    return res.json(turmas);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar turmas' });
  }
});

// 3. Rota para cadastrar um Catequisando em uma Turma
app.post('/api/catequisandos', async (req, res) => {
  try {
    const { nomeCompleto, etapa, turmaId } = req.body;
    const catequisando = await prisma.catequisando.create({
      data: { nomeCompleto, etapa, turmaId },
    });
    return res.status(201).json(catequisando);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar catequisando' });
  }
});

// Rota para atualizar um Encontro (Tema, Fase ou Data)
app.put('/api/encontros/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tema, fase, data } = req.body;

    const encontroAtualizado = await prisma.encontro.update({
      where: { id },
      data: {
        ...(tema && { tema }),
        ...(fase && { fase }),
        ...(data && { data: new Date(data) }),
      },
    });

    return res.json({
      message: 'Encontro atualizado com sucesso!',
      encontro: encontroAtualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar encontro:', error);
    return res.status(500).json({ error: 'Erro ao atualizar encontro' });
  }
});

// 4. Rota para criar um Encontro e gerar a chamada inicial
app.post('/api/encontros', async (req, res) => {
  try {
    const { turmaId, fase, tema, data } = req.body;

    const encontro = await prisma.encontro.create({
      data: { 
        turmaId, 
        fase, 
        tema,
        // Se a data for enviada pelo planejamento, converte para Date, senão usa a data atual
        data: data ? new Date(data) : new Date() 
      },
    });

    const catequisandos = await prisma.catequisando.findMany({
      where: { turmaId },
    });

    const presencasData = catequisandos.map((aluno) => ({
      encontroId: encontro.id,
      catequisandoId: aluno.id,
      status: 'P',
    }));

    if (presencasData.length > 0) {
      await prisma.presenca.createMany({
        data: presencasData,
      });
    }

    return res.status(201).json({
      message: 'Encontro criado e chamada gerada com sucesso!',
      encontro,
      totalAlunosAfetados: presencasData.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar encontro e chamada' });
  }
});

// 5. Rota para atualizar a chamada em lote
app.put('/api/presencas', async (req, res) => {
  try {
    const { atualizacoes } = req.body; 

    for (const item of atualizacoes) {
      await prisma.presenca.update({
        where: { id: item.id },
        data: { status: item.status },
      });
    }

    return res.json({ message: 'Chamada atualizada com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar chamada' });
  }
});

// 6. Rota para listar encontros e presenças de uma turma
app.get('/api/turmas/:turmaId/encontros', async (req, res) => {
  try {
    const { turmaId } = req.params;
    const encontros = await prisma.encontro.findMany({
      where: { turmaId },
      include: {
        presencas: {
          include: { catequisando: true },
        },
      },
      orderBy: { data: 'desc' },
    });

    return res.json(encontros);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar encontros da turma' });
  }
});

// 7. Rota para exportar a ata individual de uma turma em Excel (.xlsx)
app.get('/api/turmas/:turmaId/exportar-ata', async (req, res) => {
  try {
    const { turmaId } = req.params;

    const turma = await prisma.turma.findUnique({
      where: { id: turmaId },
      include: {
        catequisandos: true,
        encontros: {
          include: { presencas: true },
          orderBy: { data: 'asc' },
        },
      },
    });

    if (!turma) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    const workbook = new ExcelJS.Workbook();
    
    let nomeAta = turma.nome ? turma.nome.trim() : 'Turma';
    nomeAta = nomeAta.replace(/[\\/?*\[\]:]/g, '');
    if (!nomeAta) nomeAta = 'Turma';
    if (nomeAta.length > 31) nomeAta = nomeAta.substring(0, 31);

    const sheet = workbook.addWorksheet(nomeAta);

    const temasEncontros = turma.encontros.map(e => e.tema || 'Encontro');
    sheet.addRow([
      '', '', turma.nome, 
      'FALTAS NO PRÉ CATECUMENATO', 
      'FALTAS NO CATECUMENATO', 
      'ATÉ 2 FALTAS PERMITIDAS COM OU SEM JUSTIFICATIVA',
      ...temasEncontros
    ]);

    turma.catequisandos.forEach((aluno, index) => {
      const presencasAluno = turma.encontros.flatMap(e => e.presencas || []).filter(p => p.catequisandoId === aluno.id);
      const totalFaltas = presencasAluno.filter(p => p.status === 'F').length;
      const aptidao = totalFaltas <= 2 ? 'APTO' : 'NÃO APTO';

      const linhaDados: any[] = [
        index + 1,
        aluno.etapa || 'C',
        aluno.nomeCompleto || 'Sem Nome',
        totalFaltas,
        0,
        aptidao
      ];

      turma.encontros.forEach(encontro => {
        const registro = encontro.presencas?.find(p => p.catequisandoId === aluno.id);
        linhaDados.push(registro ? registro.status : 'P');
      });

      sheet.addRow(linhaDados);
    });

    // Aplica o polimento visual na planilha
    formatarSheetAta(sheet, turma.encontros.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Ata_Chamada_${nomeAta.replace(/\s+/g, '_')}.xlsx`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Erro detalhado no exportar-ata:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Erro interno ao gerar a planilha da ata' });
    }
  }
});

// 8. Rota para exportar a ata consolidada de TODAS as turmas em abas separadas
app.get('/api/turmas/exportar-todas-atas', async (req, res) => {
  try {
    const turmas = await prisma.turma.findMany({
      include: {
        catequisandos: true,
        encontros: {
          include: { presencas: true },
          orderBy: { data: 'asc' },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const nomesAbasUsados = new Set<string>();

    for (const turma of turmas) {
      let nomeAta = turma.nome ? turma.nome.trim() : 'Turma';
      nomeAta = nomeAta.replace(/[\\/?*\[\]:]/g, '');
      if (!nomeAta) nomeAta = 'Turma';
      if (nomeAta.length > 31) nomeAta = nomeAta.substring(0, 31);
      
      let nomeFinal = nomeAta;
      let contador = 1;
      while (nomesAbasUsados.has(nomeFinal)) {
        const sufixo = `_${contador}`;
        const tamanhoMaxBase = 31 - sufixo.length;
        nomeFinal = `${nomeAta.substring(0, tamanhoMaxBase)}${sufixo}`;
        contador++;
      }
      nomesAbasUsados.add(nomeFinal);

      const sheet = workbook.addWorksheet(nomeFinal);
      const temasEncontros = turma.encontros.map(e => e.tema || 'Encontro');

      sheet.addRow([
        '', '', turma.nome || 'Turma', 
        'FALTAS NO PRÉ CATECUMENATO', 
        'FALTAS NO CATECUMENATO', 
        'ATÉ 2 FALTAS PERMITIDAS COM OU SEM JUSTIFICATIVA',
        ...temasEncontros
      ]);

      turma.catequisandos.forEach((aluno, index) => {
        const presencasAluno = turma.encontros.flatMap(e => e.presencas || []).filter(p => p.catequisandoId === aluno.id);
        const totalFaltas = presencasAluno.filter(p => p.status === 'F').length;
        const aptidao = totalFaltas <= 2 ? 'APTO' : 'NÃO APTO';

        const linhaDados: any[] = [
          index + 1,
          aluno.etapa || 'C',
          aluno.nomeCompleto || 'Sem Nome',
          totalFaltas,
          0,
          aptidao
        ];

        turma.encontros.forEach(encontro => {
          const registro = encontro.presencas?.find(p => p.catequisandoId === aluno.id);
          linhaDados.push(registro ? registro.status : 'P');
        });

        sheet.addRow(linhaDados);
      });

      // Aplica o polimento visual em cada aba gerada
      formatarSheetAta(sheet, turma.encontros.length);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Ata_Geral_Catequese_Completa.xlsx');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Erro detalhado no exportar-todas-atas:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Erro interno ao gerar ata consolidada' });
    }
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});