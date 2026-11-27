import { useState } from 'react';
import { GameRouter } from './ui/screens/GameRouter';
import { TimelinePreviewPage } from './ui/match/TimelinePreviewPage';
import { WelcomeSplashScreen } from './ui/screens/WelcomeSplashScreen';
import './App.css';

function App() {
  const [entrou, setEntrou] = useState(false);
  const previewTimeline =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === 'timeline';

  if (previewTimeline) {
    return <TimelinePreviewPage />;
  }

  if (!entrou) {
    return <WelcomeSplashScreen onComecar={() => setEntrou(true)} />;
  }

  return <GameRouter />;
}

export default App;
