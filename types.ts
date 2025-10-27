
export interface Player {
  posX: number;
  posY: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
  ammo: number;
  maxAmmo: number;
  score: number;
  weapon: 'gun' | 'knife';
  health: number;
  maxHealth: number;
  isImmune: boolean;
  immunityTimer: number;
}

export interface Sprite {
  type: 'enemy' | 'medkit';
  x: number;
  y: number;
  initialX: number;
  initialY: number;
  health?: number;
  state: 'idle' | 'chasing' | 'dying' | 'dead';
  deathTimer?: number;
  respawnTimer: number;
  name?: string;
  attackCooldown?: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}
