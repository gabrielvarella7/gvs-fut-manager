import { useEffect, useState } from 'react';
import { carregarDatabaseInicial } from '../../db/database';
import { useGameStore } from '../../store/useGameStore';
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

  switch (tela) {
    case 'menu':
      return <MainMenuScreen />;
    case 'criar_tecnico':
      return <ManagerCreateScreen />;
    case 'escolher_time_ficticio':
      return <FictionalTeamPickScreen />;
    case 'hub_torneio':
      return <TournamentHubScreen />;
    case 'escritorio':
      return <OfficeHubScreen />;
    case 'noticias':
      return <NewsScreen />;
    case 'transferencias':
      return <TransfersScreen />;
    case 'financas':
      return <FinancesScreen />;
    case 'staff':
      return <StaffScreen />;
    case 'base':
      return <BaseScreen />;
    case 'sub23':
      return <Sub23Screen />;
    case 'treinos':
      return <TreinosScreen />;
    case 'calendario':
      return <CalendarScreen />;
    case 'classificacao':
      return <ClassificationScreen />;
    case 'elenco':
      return <SquadScreen />;
    case 'perfil_jogador':
      return <PlayerProfileScreen />;
    case 'tatica':
      return <TacticsScreen />;
    case 'partida':
      return <MatchScreen />;
    case 'relatorio_pre_jogo':
      return <PreMatchReportScreen />;
    case 'propostas':
      return <OffersScreen />;
    case 'carregar':
      return <LoadGameScreen />;
    case 'configuracoes':
      return <SettingsScreen />;
    default:
      return <MainMenuScreen />;
  }
}