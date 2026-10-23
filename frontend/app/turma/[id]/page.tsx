'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

interface Catequisando {
  id: string;
  nomeCompleto: string;
  etapa: string;
}

interface Presenca {
  id: string;
  catequisandoId: string;
  status: string; // P, F, FJ, RE
}

interface Encontro {
  id: string;
  tema: string;
  fase: string;
  data: string;
  presencas: Presenca[];
}

interface Turma {
  id: string;
  nome: string;
  diaSemana: string;
  catequisandos: Catequisando[];
  encontros: Encontro[];
}

function ConteudoChamada() {
  const params = useParams();
  const turmaId = params?.id as string;

  const [turma, setTurma] = useState<Turma | null>(null);
  const [encontros, setEncontros] = useState<Encontro[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'chamada' | 'historico' | 'programacao'>('chamada');

  const [novoTema, setNovoTema] = useState('');
  const [novaFase, setNovaFase] = useState('PRÉ-CATECUMENATO');
  const [novaData, setNovaData] = useState('');

  // Estados para planejar na aba de Programação
  const [temaPlanejado, setTemaPlanejado] = useState('');
  const [fasePlanejada, setFasePlanejada] = useState('PRÉ-CATECUMENATO');
  const [dataPlanejada, setDataPlanejada] = useState('');

  // Estados para Modal/Edição de Encontro
  const [encontroEditando, setEncontroEditando] = useState<Encontro | null>(null);
  const [temaEdicao, setTemaEdicao] = useState('');
  const [faseEdicao, setFaseEdicao] = useState('');
  const [dataEdicao, setDataEdicao] = useState('');

  const [alteracoes, setAlteracoes] = useState<{ [key: string]: string }>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (turmaId) {
      carregarDados();
    }
  }, [turmaId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const resTurma = await axios.get(`http://localhost:3333/api/turmas`);
      const turmaEncontrada = resTurma.data.find((t: Turma) => t.id === turmaId);
      
      const resEncontros = await axios.get(`http://localhost:3333/api/turmas/${turmaId}/encontros`);

      if (turmaEncontrada) {
        setTurma({
          ...turmaEncontrada,
          encontros: resEncontros.data
        });
        setEncontros(resEncontros.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da chamada:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarEncontro = async (e: React.FormEvent, isPlanejado = false) => {
    e.preventDefault();
    const tema = isPlanejado ? temaPlanejado : novoTema;
    const fase = isPlanejado ? fasePlanejada : novaFase;
    const data = isPlanejado ? dataPlanejada : novaData;

    if (!tema.trim()) return alert('Informe o tema do encontro.');

    try {
      await axios.post('http://localhost:3333/api/encontros', {
        turmaId,
        tema,
        fase,
        data: data || undefined,
      });

      if (isPlanejado) {
        setTemaPlanejado('');
        setDataPlanejada('');
        alert('Encontro planejado e adicionado ao cronograma com sucesso!');
      } else {
        setNovoTema('');
        setNovaData('');
        alert('Encontro criado e chamada gerada com sucesso!');
      }

      carregarDados();
    } catch (error) {
      console.error('Erro ao criar encontro:', error);
      alert('Erro ao criar encontro.');
    }
  };

  const abrirEdicaoEncontro = (enc: Encontro) => {
    setEncontroEditando(enc);
    setTemaEdicao(enc.tema);
    setFaseEdicao(enc.fase);
    // Formata a data para o input date (YYYY-MM-DD)
    const dataFormatada = enc.data ? new Date(enc.data).toISOString().split('T')[0] : '';
    setDataEdicao(dataFormatada);
  };

  const salvarEdicaoEncontro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encontroEditando) return;

    try {
      await axios.put(`http://localhost:3333/api/encontros/${encontroEditando.id}`, {
        tema: temaEdicao,
        fase: faseEdicao,
        data: dataEdicao,
      });

      setEncontroEditando(null);
      carregarDados();
      alert('Encontro atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar encontro:', error);
      alert('Erro ao atualizar encontro.');
    }
  };

  const alterarStatusLocal = (presencaId: string, statusAtual: string) => {
    const ciclos: { [key: string]: string } = {
      'P': 'F',
      'F': 'FJ',
      'FJ': 'RE',
      'RE': 'P'
    };
    const proximoStatus = ciclos[statusAtual] || 'P';

    setAlteracoes(prev => ({
      ...prev,
      [presencaId]: proximoStatus
    }));
  };

  const salvarChamada = async () => {
    try {
      setSalvando(true);
      const atualizacoes = Object.entries(alteracoes).map(([id, status]) => ({
        id,
        status
      }));

      if (atualizacoes.length === 0) {
        alert('Nenhuma alteração feita.');
        setSalvando(false);
        return;
      }

      await axios.put('http://localhost:3333/api/presencas', { atualizacoes });
      setAlteracoes({});
      carregarDados();
      alert('Chamada salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar chamada:', error);
      alert('Erro ao salvar alteração de presenças.');
    } finally {
      setSalvando(false);
    }
  };

  const formatarData = (dataStr: string) => {
    if (!dataStr) return 'Data não informada';
    const data = new Date(dataStr);
    return isNaN(data.getTime()) ? 'Data inválida' : data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  if (loading || !turma) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg text-slate-600 font-medium animate-pulse">Carregando painel da turma...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Topo */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <Link href="/" className="text-xs font-bold text-blue-600 hover:underline mb-1 inline-block">
              ← Voltar para o Painel Geral
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900">{turma.nome}</h1>
            <p className="text-sm text-slate-500">Gestão de Frequência e Cronograma • {turma.diaSemana}</p>
          </div>

          <div className="flex items-center gap-3">
            {Object.keys(alteracoes).length > 0 && abaAtiva === 'chamada' && (
              <button
                onClick={salvarChamada}
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md transition animate-bounce cursor-pointer"
              >
                {salvando ? 'Salvando...' : '💾 Salvar Alterações'}
              </button>
            )}
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 bg-white px-6 rounded-2xl shadow-sm">
          <button
            onClick={() => setAbaAtiva('chamada')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition cursor-pointer ${
              abaAtiva === 'chamada' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Chamada Interativa
          </button>
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition cursor-pointer ${
              abaAtiva === 'historico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📜 Histórico ({encontros.length})
          </button>
          <button
            onClick={() => setAbaAtiva('programacao')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition cursor-pointer ${
              abaAtiva === 'programacao' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📅 Inserir no Planejamento
          </button>
        </div>

        {/* CONTEÚDO DA ABA: CHAMADA */}
        {abaAtiva === 'chamada' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Adicionar Novo Encontro / Chamada</h2>
              <form onSubmit={(e) => criarEncontro(e, false)} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Tema do Encontro (ex: O Amor de Deus)"
                  value={novoTema}
                  onChange={(e) => setNovoTema(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={novaFase}
                  onChange={(e) => setNovaFase(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRÉ-CATECUMENATO">Pré-Catecumenato</option>
                  <option value="CATECUMENATO">Catecumenato</option>
                </select>
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition cursor-pointer shadow-sm"
                >
                  ➕ Criar Encontro
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Planilha de Frequência</h2>
                <div className="flex gap-3 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded inline-block"></span> P: Presente</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded inline-block"></span> F: Faltou</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded inline-block"></span> FJ: Justificado</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded inline-block"></span> RE: Reposição</span>
                </div>
              </div>

              {encontros.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">
                  Nenhum encontro cadastrado para esta turma ainda. Crie um acima para começar!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                        <th className="p-4">Aluno</th>
                        <th className="p-4 text-center">Etapa</th>
                        {encontros.map((enc) => (
                          <th key={enc.id} className="p-4 text-center min-w-[150px]" title={enc.tema}>
                            <div className="truncate max-w-[160px] font-bold text-slate-800">{enc.tema}</div>
                            <div className="text-[10px] text-blue-600 font-semibold">{formatarData(enc.data)}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {turma.catequisandos.map((aluno) => (
                        <tr key={aluno.id} className="hover:bg-slate-50 transition">
                          <td className="p-4 font-medium text-slate-800">{aluno.nomeCompleto}</td>
                          <td className="p-4 text-center">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">
                              {aluno.etapa}
                            </span>
                          </td>
                          {encontros.map((enc) => {
                            const presenca = enc.presencas?.find(p => p.catequisandoId === aluno.id);
                            const statusAtual = presenca ? (alteracoes[presenca.id] || presenca.status) : 'P';

                            const coresStatus: { [key: string]: string } = {
                              'P': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                              'F': 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
                              'FJ': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
                              'RE': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                            };

                            return (
                              <td key={enc.id} className="p-4 text-center">
                                {presenca ? (
                                  <button
                                    onClick={() => alterarStatusLocal(presenca.id, statusAtual)}
                                    className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition shadow-sm cursor-pointer ${coresStatus[statusAtual] || ''}`}
                                    title="Clique para alterar o status"
                                  >
                                    {statusAtual}
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: HISTÓRICO */}
        {abaAtiva === 'historico' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Histórico de Encontros Realizados</h2>
            <p className="text-sm text-slate-500">Lista cronológica de todos os encontros. Clique em "Editar" para corrigir datas ou temas duplicados.</p>

            <div className="divide-y divide-slate-100 mt-4">
              {encontros.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">Nenhum encontro registrado no histórico.</p>
              ) : (
                encontros.map((enc, index) => (
                  <div key={enc.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          Encontro #{index + 1}
                        </span>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {enc.fase}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mt-1">{enc.tema}</h3>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-600 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                        📅 {formatarData(enc.data)}
                      </div>
                      <button
                        onClick={() => abrirEdicaoEncontro(enc)}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition cursor-pointer shadow-sm"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: PROGRAMAÇÃO */}
        {abaAtiva === 'programacao' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Planejar e Inserir Novo Encontro no Cronograma</h2>
              <p className="text-sm text-slate-500">Adicione os encontros futuros informando a data prevista.</p>
            </div>

            <form onSubmit={(e) => criarEncontro(e, true)} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Novo Encontro Planejado</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tema do Encontro</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: A Oração do Pai Nosso"
                    value={temaPlanejado}
                    onChange={(e) => setTemaPlanejado(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fase</label>
                  <select
                    value={fasePlanejada}
                    onChange={(e) => setFasePlanejada(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRÉ-CATECUMENATO">Pré-Catecumenato</option>
                    <option value="CATECUMENATO">Catecumenato</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Prevista</label>
                  <input
                    type="date"
                    required
                    value={dataPlanejada}
                    onChange={(e) => setDataPlanejada(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition cursor-pointer shadow-sm"
              >
                📅 Salvar Encontro no Cronograma
              </button>
            </form>
          </div>
        )}

        {/* MODAL DE EDIÇÃO DE ENCONTRO */}
        {encontroEditando && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Editar Encontro</h2>
                <button 
                  onClick={() => setEncontroEditando(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={salvarEdicaoEncontro} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tema do Encontro</label>
                  <input
                    type="text"
                    required
                    value={temaEdicao}
                    onChange={(e) => setTemaEdicao(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Fase</label>
                  <select
                    value={faseEdicao}
                    onChange={(e) => setFaseEdicao(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRÉ-CATECUMENATO">Pré-Catecumenato</option>
                    <option value="CATECUMENATO">Catecumenato</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Data do Encontro</label>
                  <input
                    type="date"
                    required
                    value={dataEdicao}
                    onChange={(e) => setDataEdicao(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEncontroEditando(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-sm cursor-pointer"
                  >
                    Salvar Alterações
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

export default function TelaChamada() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 font-medium">Carregando painel...</div>}>
      <ConteudoChamada />
    </Suspense>
  );
}