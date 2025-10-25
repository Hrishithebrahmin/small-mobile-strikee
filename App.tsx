import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import { LEADERBOARD_NAMES } from './constants';
import type { LeaderboardEntry } from './types';

// Helper to shuffle array
const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};


const App: React.FC = () => {
  const [playerScore, setPlayerScore] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const shuffledNames = shuffleArray([...LEADERBOARD_NAMES]);
    const data = shuffledNames.slice(0, 10).map(name => ({
      name,
      score: Math.floor(Math.random() * 20) * 10 + 25, // Random scores in increments of 10
    })).sort((a, b) => b.score - a.score);
    setLeaderboardData(data);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
      return;
    }
    (installPrompt as any).prompt();
    (installPrompt as any).userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setInstallPrompt(null);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="w-full max-w-6xl text-center mb-4">
        <h1 className="text-3xl md:text-5xl font-bold text-red-500 tracking-widest uppercase" style={{fontFamily: "'Courier New', Courier, monospace"}}>
          Small mobile strike
        </h1>
        <p className="text-gray-400 mt-2 text-sm md:text-base">
          <span className="hidden md:inline">Move: W, A, S, D | Turn: Arrows | Shoot: Space | Reload: R | Gun: 1 | Knife: Q</span>
          <span className="md:hidden font-bold">Mobile: Use Left-Screen Joystick to Move, Right-Screen to Look & Shoot.</span>
        </p>
         {installPrompt && (
          <button
            onClick={handleInstallClick}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-2 animate-pulse"
          >
            Install on your device
          </button>
        )}
      </div>
       <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 items-start">
        <div className="flex-grow w-full md:w-auto aspect-video bg-gray-800 border-4 border-gray-600 shadow-2xl shadow-red-500/20">
          <GameCanvas onScoreChange={setPlayerScore} />
        </div>
        <Leaderboard entries={leaderboardData} playerScore={playerScore} />
      </div>
      <p className="text-gray-500 mt-4 text-sm">
        A low-resolution raycasting demo built with React & TypeScript.
      </p>
    </div>
  );
};

export default App;