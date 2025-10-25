import React from 'react';
import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  playerScore: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, playerScore }) => {
  return (
    <div className="w-full md:w-64 bg-gray-800 border-2 border-gray-600 p-4 text-white self-stretch" style={{fontFamily: "'Courier New', Courier, monospace"}}>
      <h2 className="text-2xl text-red-500 font-bold mb-4 text-center tracking-widest">LEADERBOARD</h2>
      <ol className="list-decimal list-inside space-y-2">
        {entries.map((entry, index) => (
          <li key={index} className="flex justify-between text-sm">
            <span>{`${index + 1}. ${entry.name.toUpperCase()}`}</span>
            <span className="font-bold">{String(entry.score).padStart(6, '0')}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 pt-4 border-t-2 border-gray-600">
          <div className="flex justify-between text-lg">
            <span className="text-yellow-400">YOUR SCORE</span>
            <span className="font-bold text-yellow-400">{String(playerScore).padStart(6, '0')}</span>
          </div>
      </div>
    </div>
  );
};

export default Leaderboard;
