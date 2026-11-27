import { useState } from 'react';
import { GameRouter } from './ui/screens/GameRouter';
import { WelcomeSplashScreen } from './ui/screens/WelcomeSplashScreen';
import './App.css';

function App() {
  const [entrou, setEntrou] = useState(false);

  if (!entrou) {
    return <WelcomeSplashScreen onComecar={() => setEntrou(true)} />;
  }

  return <GameRouter />;
}

export default App;
