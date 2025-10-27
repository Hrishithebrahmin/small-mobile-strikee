import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import { LEADERBOARD_NAMES } from './constants';
import type { LeaderboardEntry } from './types';
import { setMuted, startBackgroundMusic, stopBackgroundMusic } from './utils/audio';

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
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    setMuted(newMutedState);
  };

  const handleTogglePause = () => {
    setIsPaused(true);
    stopBackgroundMusic();
  };

  const handleResume = () => {
    setIsPaused(false);
    startBackgroundMusic();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="w-full max-w-6xl text-center mb-4 relative">
        <h1 className="text-3xl md:text-5xl font-bold text-red-500 tracking-widest uppercase" style={{fontFamily: "'Courier New', Courier, monospace"}}>
          Small mobile strike
        </h1>
        <div className="absolute top-0 right-0 flex items-center gap-2">
            <button
            onClick={handleToggleMute}
            className="p-2 text-white bg-gray-800 border-2 border-gray-600 rounded-lg hover:bg-gray-700"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
            {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
            )}
            </button>
            <button
                onClick={handleTogglePause}
                className="p-2 text-white bg-gray-800 border-2 border-gray-600 rounded-lg hover:bg-gray-700"
                aria-label="Settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>
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
       <div className="w-full max-w-6xl relative">
            {isPaused && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 rounded-lg">
                    <h2 className="text-4xl font-bold text-red-500 mb-8 tracking-widest" style={{fontFamily: "'Courier New', Courier, monospace"}}>GAME PAUSED</h2>
                    <button
                    onClick={handleResume}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded text-xl"
                    >
                    Resume
                    </button>
                </div>
            )}
            <div className="w-full flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-grow w-full md:w-auto aspect-video bg-gray-800 border-4 border-gray-600 shadow-2xl shadow-red-500/20">
                    <GameCanvas onScoreChange={setPlayerScore} isPaused={isPaused} />
                </div>
                <Leaderboard entries={leaderboardData} playerScore={playerScore} />
            </div>
       </div>
      <p className="text-gray-500 mt-4 text-sm">
        A low-resolution raycasting demo built with React & TypeScript.
      </p>
    </div>
  );
};

export default App;