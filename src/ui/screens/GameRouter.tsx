import { useEffect, useState, type ReactNode } from 'react';
import { carregarDatabaseInicial } from '../../db/database';
import { useGameStore } from '../../store/useGameStore';
import { AssistenteAjuda } from '../components/AssistenteAjuda';
import { MainMenuScreen } from './MainMenuScreen';
import { ManagerCreateScreen } from './ManagerCreateScreen';
import { FictionalTeamPickScreen } from './FictionalTeamPickScreen';
import { TournamentHubScreen } from './TournamentHubScreen';
import { SquadScreen } from './SquadScreen';
import { TacticsScreen } from './TacticsScreen';
import { MatchScreen } from './MatchScreen';
import { OffersScreen } from './OffersScreen';
import { LoadGameScreen } from './LoadGameScreen';
import { OfficeHubScreen } from './OfficeHubScreen';
import { NewsScreen } from './NewsScreen';
import { TransfersScreen } from './TransfersScreen';
import { FinancesScreen } from './FinancesScreen';
import { CalendarScreen } from './CalendarScreen';
import { ClassificationScreen } from './ClassificationScreen';
import { PlayerProfileScreen } from './PlayerProfileScreen';
import { PreMatchReportScreen } from './PreMatchReportScreen';
import { SettingsScreen } from './SettingsScreen';
import { StaffScreen } from './StaffScreen';
import { BaseScreen } from './BaseScreen';
import { Sub23Screen } from './Sub23Screen';
import { TreinosScreen } from './TreinosScreen';

export function GameRouter() {
  const setDatabase = useGameStore((s) => s.setDatabase);
  const tela = useGameStore((s) => s.tela);
  const dbPronto = useGameStore((s) => s.dbPronto);
  const [erroDb, setErroDb] = useState<string | null>(null);

  useEffect(() => {
    setErroDb(null);
    carregarDatabaseInicial()
      .then(setDatabase)
      .catch((e: unknown) => {
        console.error(e);
        const msg = e instanceof Error ? e.message : 'Erro ao carregar o banco.';
        setErroDb(msg);
      });
  }, [setDatabase]);

  if (!dbPronto) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center text-zinc-400">
        {erroDb ? (
          <>
            <p className="text-sm text-rose-300">Falha ao carregar a base de dados</p>
            <p className="max-w-md text-xs text-zinc-500">{erroDb}</p>
            <button
              type="button"
              className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
              onClick={() => window.location.reload()}
            >
              Tentar de novo
            </button>
          </>
        ) : (
          <p>Carregando base de dados…</p>
        )}
      </div>
    );
  }

  let telaAtual: ReactNode;
  switch (tela) {
    case 'menu':
      telaAtual = <MainMenuScreen />;
      break;
    case 'criar_tecnico':
      telaAtual = <ManagerCreateScreen />;
      break;
    case 'escolher_time_ficticio':
      telaAtual = <FictionalTeamPickScreen />;
      break;
    case 'hub_torneio':
      telaAtual = <TournamentHubScreen />;
      break;
    case 'escritorio':
      telaAtual = <OfficeHubScreen />;
      break;
    case 'noticias':
      telaAtual = <NewsScreen />;
      break;
    case 'transferencias':
      telaAtual = <TransfersScreen />;
      break;
    case 'financas':
      telaAtual = <FinancesScreen />;
      break;
    case 'staff':
      telaAtual = <StaffScreen />;
      break;
    case 'base':
      telaAtual = <BaseScreen />;
      break;
    case 'sub23':
      telaAtual = <Sub23Screen />;
      break;
    case 'treinos':
      telaAtual = <TreinosScreen />;
      break;
    case 'calendario':
      telaAtual = <CalendarScreen />;
      break;
    case 'classificacao':
      telaAtual = <ClassificationScreen />;
      break;
    case 'elenco':
      telaAtual = <SquadScreen />;
      break;
    case 'perfil_jogador':
      telaAtual = <PlayerProfileScreen />;
      break;
    case 'tatica':
      telaAtual = <TacticsScreen />;
      break;
    case 'partida':
      telaAtual = <MatchScreen />;
      break;
    case 'relatorio_pre_jogo':
      telaAtual = <PreMatchReportScreen />;
      break;
    case 'propostas':
      telaAtual = <OffersScreen />;
      break;
    case 'carregar':
      telaAtual = <LoadGameScreen />;
      break;
    case 'configuracoes':
      telaAtual = <SettingsScreen />;
      break;
    default:
      telaAtual = <MainMenuScreen />;
  }

  return (
    <>
      {telaAtual}
      {/* Fora do splash — botão flutuante de ajuda (regras/UI) */}
      <AssistenteAjuda />
    </>
  );
}