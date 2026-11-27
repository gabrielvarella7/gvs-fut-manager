import { useEffect, useId, useRef, useState } from 'react';
import { CircleHelp, SendHorizontal, X } from 'lucide-react';
import {
  checarAssistente,
  perguntarAssistente,
  type AssistenteMsg,
} from '../../assistente/assistenteApi';

const SUGESTOES = [
  'O que faz a Prevenção Muscular?',
  'Como funciona a energia?',
  'O que são os alertas do fisiologista?',
];

type Bolha = { id: string; role: 'user' | 'model' | 'sistema'; text: string };

export function AssistenteAjuda() {
  const tituloId = useId();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [bolhas, setBolhas] = useState<Bolha[]>([
    {
      id: 'boas',
      role: 'sistema',
      text: 'Pergunte sobre regras e telas do Mestre Mou (energia, treinos, lesões, base…).',
    },
  ]);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [avisoConfig, setAvisoConfig] = useState<string | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancel = false;
    checarAssistente().then((s) => {
      if (cancel) return;
      setDisponivel(s.configured);
      if (!s.configured) {
        setAvisoConfig(
          s.message ||
            'Assistente indisponível. Configure GEMINI_API_KEY no servidor — veja docs/ASSISTENTE-GEMINI.md.',
        );
      }
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [aberto, bolhas, enviando]);

  const historicoParaApi = (): AssistenteMsg[] =>
    bolhas
      .filter((b) => b.role === 'user' || b.role === 'model')
      .map((b) => ({ role: b.role as 'user' | 'model', text: b.text }));

  const enviar = async (mensagem: string) => {
    const msg = mensagem.trim();
    if (!msg || enviando) return;
    if (disponivel === false) {
      setBolhas((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text: msg },
        {
          id: `s-${Date.now()}`,
          role: 'sistema',
          text:
            avisoConfig ||
            'Assistente indisponível. Defina GEMINI_API_KEY no ambiente do proxy (local/Vercel/Cloudflare).',
        },
      ]);
      setTexto('');
      return;
    }

    setEnviando(true);
    setTexto('');
    const idUser = `u-${Date.now()}`;
    setBolhas((prev) => [...prev, { id: idUser, role: 'user', text: msg }]);

    const hist = historicoParaApi();
    const res = await perguntarAssistente(msg, hist);

    if (res.ok) {
      setBolhas((prev) => [
        ...prev,
        { id: `m-${Date.now()}`, role: 'model', text: res.resposta },
      ]);
    } else {
      if (res.code === 'assistente_indisponivel') {
        setDisponivel(false);
        setAvisoConfig(res.error);
      }
      setBolhas((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'sistema',
          text: res.error || 'Assistente indisponível.',
        },
      ]);
    }
    setEnviando(false);
  };

  return (
    <>
      <button
        type="button"
        className="assistente-fab"
        aria-label={aberto ? 'Fechar ajuda' : 'Abrir ajuda do Mestre Mou'}
        aria-expanded={aberto}
        aria-controls={aberto ? 'assistente-painel' : undefined}
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? <X size={22} strokeWidth={2.25} /> : <CircleHelp size={22} strokeWidth={2.25} />}
      </button>

      {aberto && (
        <section
          id="assistente-painel"
          className="assistente-painel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={tituloId}
        >
          <header className="assistente-painel__cabecalho">
            <div>
              <p className="assistente-painel__eyebrow">Mestre Mou</p>
              <h2 id={tituloId} className="assistente-painel__titulo">
                Assistente de regras
              </h2>
            </div>
            <button
              type="button"
              className="assistente-painel__fechar"
              aria-label="Fechar"
              onClick={() => setAberto(false)}
            >
              <X size={18} />
            </button>
          </header>

          {disponivel === false && (
            <p className="assistente-painel__aviso" role="status">
              {avisoConfig?.trim() ||
                'Assistente indisponível: defina GEMINI_API_KEY no servidor.'}{' '}
              Chave em <span className="whitespace-nowrap">aistudio.google.com</span> → variável{' '}
              <code>GEMINI_API_KEY</code> (nunca no chat). Ver{' '}
              <code>docs/ASSISTENTE-GEMINI.md</code>.
            </p>
          )}

          <div className="assistente-painel__mensagens" ref={listaRef}>
            {bolhas.map((b) => (
              <div
                key={b.id}
                className={
                  b.role === 'user'
                    ? 'assistente-bolha assistente-bolha--user'
                    : b.role === 'model'
                      ? 'assistente-bolha assistente-bolha--model'
                      : 'assistente-bolha assistente-bolha--sistema'
                }
              >
                {b.text}
              </div>
            ))}
            {enviando && (
              <div className="assistente-bolha assistente-bolha--sistema" aria-live="polite">
                Pensando…
              </div>
            )}
          </div>

          {disponivel !== false && bolhas.length <= 2 && (
            <div className="assistente-painel__sugestoes">
              {SUGESTOES.map((s) => (
                <button key={s} type="button" onClick={() => void enviar(s)} disabled={enviando}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="assistente-painel__form"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar(texto);
            }}
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={texto}
              disabled={enviando}
              placeholder="Ex.: o que é energia no elenco?"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void enviar(texto);
                }
              }}
            />
            <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar">
              <SendHorizontal size={18} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
