'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface Catequisando {
  id: string;
  nomeCompleto: string;
  etapa: string;
}

interface Turma {
  id: string;
  nome: string;
  diaSemana: string;
  catequisandos: Catequisando[];
}

export default function Dashboard() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // Estados para o Modal de Cadastro de Aluno
  const [modalAberto, setModalAberto] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [etapa, setEtapa] = useState('PRÉ-CATECUMENATO');
  const [turmaIdSelecionada, setTurmaIdSelecionada] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarTurmas();
  }, []);

  const carregarTurmas = async () => {
    try {
      const response = await axios.get('http://localhost:3333/api/turmas');
      setTurmas(response.data);
      if (response.data.length > 0 && !turmaIdSelecionada) {
        setTurmaIdSelecionada(response.data[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      setLoading(false);
    }
  };

  const cadastrarAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCompleto.trim() || !turmaIdSelecionada) {
      return alert('Preencha o nome completo e selecione a turma.');
    }

    try {
      setSalvando(true);
      await axios.post('http://localhost:3333/api/catequisandos', {
        nomeCompleto,
        etapa,
        turmaId: turmaIdSelecionada,
      });

      setNomeCompleto('');
      setEtapa('PRÉ-CATECUMENATO');
      setModalAberto(false);
      carregarTurmas();
      alert('Catequisando cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao cadastrar aluno:', error);
      alert('Erro ao cadastrar catequisando.');
    } finally {
      setSalvando(false);
    }
  };

  const baixarAta = async (turmaId: string, nomeTurma: string) => {
    try {
      const response = await axios.get(`http://localhost:3333/api/turmas/${turmaId}/exportar-ata`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ata_Chamada_${nomeTurma.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar a ata:', error);
      alert('Erro ao gerar a planilha da ata. Verifique se há encontros cadastrados.');
    }
  };

  const baixarTodasAsAtas = async () => {
    try {
      const response = await axios.get('http://localhost:3333/api/turmas/exportar-todas-atas', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Ata_Geral_Catequese_Completa.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar ata geral:', error);
      alert('Erro ao gerar a planilha completa.');
    }
  };

  const turmasFiltradas = turmas.filter(turma => 
    turma.nome.toLowerCase().includes(busca.toLowerCase()) ||
    turma.diaSemana.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAlunos = turmas.reduce((acc, t) => acc + (t.catequisandos?.length || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg text-blue-900 font-semibold animate-pulse">Carregando painel da catequese...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CatequeSIS</h1>
            <p className="text-slate-500 mt-1">Gestão de Turmas, Frequência e Atas Paroquiais</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setModalAberto(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              ➕ Novo Catequisando
            </button>
            <button
              onClick={baixarTodasAsAtas}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              📊 Baixar Planilha Geral
            </button>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total de Turmas</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{turmas.length}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl text-xl font-bold">🏫</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Catequisandos Matriculados</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totalAlunos}</p>
            </div>
            <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl text-xl font-bold">👥</div>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Pesquisar turma ou dia da semana..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
          />
        </div>

        {/* Grid de Cards das Turmas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmasFiltradas.map(turma => (
            <div key={turma.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold text-slate-800">{turma.nome}</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                    {turma.diaSemana}
                  </span>
                </div>
                
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inscritos</span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">
                      {turma.catequisandos?.length || 0} alunos
                    </span>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 mt-2">
                    {turma.catequisandos?.map(aluno => (
                      <div key={aluno.id} className="text-xs bg-slate-50 hover:bg-slate-100 transition p-2 rounded-lg flex justify-between items-center border border-slate-100">
                        <span className="font-medium text-slate-700 truncate max-w-[190px]" title={aluno.nomeCompleto}>
                          {aluno.nomeCompleto}
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                          {aluno.etapa}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <a
                  href={`/turma/${turma.id}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm text-center"
                >
                  📋 Fazer Chamada
                </a>
                <button
                  onClick={() => baixarAta(turma.id, turma.nome)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  📥 Ata (.xlsx)
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de Cadastro de Novo Aluno */}
        {modalAberto && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Cadastrar Novo Catequisando</h2>
                <button 
                  onClick={() => setModalAberto(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={cadastrarAluno} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do aluno"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Etapa</label>
                  <select
                    value={etapa}
                    onChange={(e) => setEtapa(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRÉ-CATECUMENATO">Pré-Catecumenato</option>
                    <option value="CATECUMENATO">Catecumenato</option>
                    <option value="CRISMA">Crisma</option>
                    <option value="EUCARISTIA">Eucaristia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Turma</label>
                  <select
                    value={turmaIdSelecionada}
                    onChange={(e) => setTurmaIdSelecionada(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {turmas.map(turma => (
                      <option key={turma.id} value={turma.id}>
                        {turma.nome} ({turma.diaSemana})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-sm cursor-pointer"
                  >
                    {salvando ? 'Salvando...' : 'Salvar Aluno'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}