import { CmMenuList, CmShell } from '../cm/CmShell';
import { useGameStore } from '../../store/useGameStore';

export function MainMenuScreen() {
  const iniciar = useGameStore((s) => s.iniciarNovoJogo);
  const irPara = useGameStore((s) => s.irPara);
  const campeonato = useGameStore((s) => s.campeonato);

  return (
    <CmShell
      titulo="GVS Manager"
      subtitulo={campeonato?.nome ?? 'Modo carreira'}
      rodape={<span className="text-xs text-zinc-600">GVS Manager</span>}
    >
      <CmMenuList
        items={[
          { label: 'Novo jogo', hint: 'Criar técnico', onClick: iniciar },
          { label: 'Carregar jogo', hint: 'Continuar carreira', onClick: () => irPara('carregar') },
          { label: 'Configurações', hint: 'Som e saves', onClick: () => irPara('configuracoes') },
          {
            label: 'Sair',
            hint: 'Fechar',
            onClick: () => {
              window.close();
            },
          },
        ]}
      />
    </CmShell>
  );
}