import React, { useRef, useEffect, useCallback } from 'react';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  worldMap,
  MOVE_SPEED,
  ROTATION_SPEED,
  TOUCH_LOOK_SENSITIVITY,
  JOYSTICK_BASE_RADIUS,
  JOYSTICK_HANDLE_RADIUS,
  JOYSTICK_AREA_WIDTH_RATIO,
  MAX_AMMO,
  GUN_BOB_SPEED,
  GUN_BOB_AMOUNT,
  FIRE_RATE,
  MELEE_RATE,
  RELOAD_TIME,
  PLAYER_MAX_HEALTH,
  PLAYER_RESPAWN_TIME,
  SPAWN_IMMUNITY_DURATION,
  WEAPON_SWITCH_BUTTON_X,
  WEAPON_SWITCH_BUTTON_Y,
  WEAPON_SWITCH_BUTTON_WIDTH,
  WEAPON_SWITCH_BUTTON_HEIGHT,
  SHOOT_BUTTON_RADIUS,
  SHOOT_BUTTON_X,
  SHOOT_BUTTON_Y,
  RELOAD_BUTTON_RADIUS,
  RELOAD_BUTTON_X,
  RELOAD_BUTTON_Y,
  initialSprites,
  ENEMY_HEALTH,
  ENEMY_SPEED,
  ENEMY_DETECTION_RANGE,
  ENEMY_DEATH_ANIM_DURATION,
  ENEMY_RESPAWN_TIME,
  ENEMY_DAMAGE,
  ENEMY_ATTACK_RATE,
  ENEMY_ATTACK_RANGE,
  GUN_DAMAGE,
  KNIFE_DAMAGE,
  KNIFE_RANGE,
  SCORE_PER_KILL,
  LEADERBOARD_NAMES,
  initialMedkits,
  MEDKIT_HEAL_AMOUNT,
  MEDKIT_RESPAWN_TIME,
  MEDKIT_PICKUP_RANGE,
} from '../constants';
import * as audio from '../utils/audio';
import type { Player, Sprite } from '../types';

interface GameCanvasProps {
  onScoreChange: (score: number) => void;
  isPaused: boolean;
}

// Helper to shuffle array
const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Easing function for smooth animation
const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreChange, isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player>({
    posX: 10.5,
    posY: 10.5,
    dirX: -1,
    dirY: 0,
    planeX: 0,
    planeY: 0.66,
    ammo: MAX_AMMO,
    maxAmmo: MAX_AMMO,
    score: 0,
    weapon: 'gun',
    health: PLAYER_MAX_HEALTH,
    maxHealth: PLAYER_MAX_HEALTH,
    isImmune: true,
    immunityTimer: SPAWN_IMMUNITY_DURATION,
  });

  const initializeSprites = () => {
    const shuffledNames = shuffleArray([...LEADERBOARD_NAMES]);
    const enemySprites: Sprite[] = initialSprites.map((s, i) => ({
      type: 'enemy',
      ...s,
      initialX: s.x,
      initialY: s.y,
      health: ENEMY_HEALTH,
      state: 'idle',
      deathTimer: 0,
      respawnTimer: 0,
      name: shuffledNames[i % shuffledNames.length],
      attackCooldown: 0,
    }));

    const medkitSprites: Sprite[] = initialMedkits.map(s => ({
      type: 'medkit',
      ...s,
      initialX: s.x,
      initialY: s.y,
      state: 'idle',
      respawnTimer: 0,
    }));
    
    return [...enemySprites, ...medkitSprites];
  }
  
  const spritesRef = useRef<Sprite[]>(initializeSprites());
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameLoopRef = useRef<number | null>(null);

  // Game state refs
  const gameTick = useRef<number>(0);
  const isMoving = useRef<boolean>(false);
  const shootAnimTimer = useRef<number>(0);
  const slashAnimTimer = useRef<number>(0);
  const shootCooldown = useRef<number>(0);
  const slashCooldown = useRef<number>(0);
  const isReloading = useRef<boolean>(false);
  const reloadTimer = useRef<number>(0);
  const zBuffer = useRef<number[]>(new Array(SCREEN_WIDTH).fill(0));
  const hasInteracted = useRef<boolean>(false);
  const recoilOffset = useRef<number>(0);
  const playerStateRef = useRef<'alive' | 'dead'>('alive');
  const playerRespawnTimer = useRef<number>(0);
  const damageFlashTimer = useRef<number>(0);
  const emptyClickCooldown = useRef<number>(0);
  const emptyGunAnimTimer = useRef<number>(0);
  const ammoFlashTimer = useRef<number>(0);


  // Weapon switch state
  const isSwitchingWeapon = useRef<boolean>(false);
  const weaponSwitchTimer = useRef<number>(0);
  const previousWeapon = useRef<'gun' | 'knife'>('gun');
  const WEAPON_SWITCH_DURATION = 20; // frames, ~0.33s at 60fps


  // Touch state refs
  const leftTouchId = useRef<number | null>(null);
  const rightTouchId = useRef<number | null>(null); // For looking
  const shootTouchId = useRef<number | null>(null);
  const joystickCenter = useRef<{ x: number; y: number } | null>(null);
  const joystickPos = useRef<{ x: number; y: number } | null>(null);
  const lookStart = useRef<{ x: number; y: number } | null>(null);
  const lookDeltaX = useRef<number>(0);
  
  const handleWeaponSwitch = useCallback((newWeapon: 'gun' | 'knife') => {
    const player = playerRef.current;
    if (isSwitchingWeapon.current || player.weapon === newWeapon) return;

    isSwitchingWeapon.current = true;
    weaponSwitchTimer.current = WEAPON_SWITCH_DURATION;
    previousWeapon.current = player.weapon;
    player.weapon = newWeapon;
    audio.playWeaponSwitch();
  }, []);

  const drawHud = (ctx: CanvasRenderingContext2D, player: Player) => {
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    
    // Score
    const scoreText = `SCORE: ${String(player.score).padStart(6, '0')}`;
    ctx.fillText(scoreText, 10, 20);
    
    // Health
    ctx.fillStyle = 'red';
    ctx.fillRect(10, SCREEN_HEIGHT - 25, 100, 15);
    const healthPercentage = player.health / player.maxHealth;
    ctx.fillStyle = 'green';
    ctx.fillRect(10, SCREEN_HEIGHT - 25, 100 * healthPercentage, 15);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, SCREEN_HEIGHT - 25, 100, 15);
    ctx.fillStyle = 'white';
    ctx.font = '12px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${player.health}/${player.maxHealth}`, 60, SCREEN_HEIGHT - 17);

    // Crosshair / Reloading indicator
    if (isReloading.current) {
        ctx.font = '20px "Courier New", Courier, monospace';
        ctx.fillStyle = 'yellow';
        ctx.textAlign = 'center';
        ctx.fillText('RELOADING...', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    } else {
      const centerX = SCREEN_WIDTH / 2;
      const centerY = SCREEN_HEIGHT / 2;
      const size = 4;
      const gap = 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      // top
      ctx.fillRect(centerX - 1, centerY - gap - size + recoilOffset.current / 2, 2, size);
      // bottom
      ctx.fillRect(centerX - 1, centerY + gap + recoilOffset.current / 2, 2, size);
      // left
      ctx.fillRect(centerX - gap - size, centerY - 1 + recoilOffset.current / 2, size, 2);
      // right
      ctx.fillRect(centerX + gap, centerY - 1 + recoilOffset.current / 2, size, 2);
    }
    
    // Ammo - only if gun is equipped
    if (player.weapon === 'gun') {
      ctx.font = '16px "Courier New", Courier, monospace';
      
      if (ammoFlashTimer.current > 0 && gameTick.current % 10 < 5) {
        ctx.fillStyle = 'red';
      } else {
        ctx.fillStyle = 'white';
      }
      
      ctx.textAlign = 'right';
      const ammoText = `AMMO: ${player.ammo}/${player.maxAmmo}`;
      ctx.fillText(ammoText, SCREEN_WIDTH - 10, SCREEN_HEIGHT - 10);
      ctx.fillStyle = 'white'; // Reset color
    }
  };

  const drawGun = (ctx: CanvasRenderingContext2D, animationOffsetY: number = 0) => {
    const moveBob = isMoving.current ? Math.sin(gameTick.current * GUN_BOB_SPEED) * GUN_BOB_AMOUNT : 0;
    const idleBob = Math.sin(gameTick.current * (GUN_BOB_SPEED / 2)) * (GUN_BOB_AMOUNT / 3);
    const totalBob = moveBob + idleBob;

    let gunYOffset = isReloading.current ? 40 * Math.sin((reloadTimer.current / RELOAD_TIME) * Math.PI) : 0;
    gunYOffset += recoilOffset.current;
    
    if (emptyGunAnimTimer.current > 0) {
      const progress = 1 - (emptyGunAnimTimer.current / 10);
      gunYOffset += Math.sin(progress * Math.PI) * -15; // Jerk up
    }

    const gunX = SCREEN_WIDTH / 2 - 25;
    const gunY = SCREEN_HEIGHT - 70 + totalBob + gunYOffset + animationOffsetY;
    
    // Gun body
    ctx.fillStyle = '#3a3a3a'; // Darker grey
    ctx.fillRect(gunX, gunY + 5, 50, 10); // Slide
    ctx.fillStyle = '#4a4a4a'; // Main grey
    ctx.fillRect(gunX, gunY + 15, 50, 15); // Frame
    
    // Grip
    ctx.fillStyle = '#2a2a2a'; // Even darker
    ctx.fillRect(gunX + 10, gunY + 30, 15, 25);
    
    // Barrel
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(gunX - 5, gunY, 10, 5);

    // Muzzle flash
    if (shootAnimTimer.current > 0) {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.moveTo(gunX, gunY);
        ctx.lineTo(gunX - 10, gunY - 15);
        ctx.lineTo(gunX + 10, gunY - 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(gunX, gunY);
        ctx.lineTo(gunX - 5, gunY - 10);
        ctx.lineTo(gunX + 5, gunY - 10);
        ctx.closePath();
        ctx.fill();
    }
  };

  const drawKnife = (ctx: CanvasRenderingContext2D, animationOffsetY: number = 0) => {
    const moveBob = isMoving.current ? Math.sin(gameTick.current * GUN_BOB_SPEED) * GUN_BOB_AMOUNT : 0;
    const idleBob = Math.sin(gameTick.current * (GUN_BOB_SPEED / 2)) * (GUN_BOB_AMOUNT / 3);
    const totalBob = moveBob + idleBob;
    
    const slashProgress = slashAnimTimer.current > 0 ? 1 - (slashAnimTimer.current / (MELEE_RATE / 4)) : 0;
    const slashAngle = Math.sin(slashProgress * Math.PI) * -0.8; // Radians for rotation
    const slashX = Math.sin(slashProgress * Math.PI) * -30;
    const slashY = Math.sin(slashProgress * Math.PI) * 10;
    
    const knifeX = SCREEN_WIDTH / 2 + 50 + slashX;
    const knifeY = SCREEN_HEIGHT - 60 + totalBob + slashY + animationOffsetY;
    
    ctx.save();
    ctx.translate(knifeX, knifeY);
    ctx.rotate(slashAngle);

    // Handle
    ctx.fillStyle = '#6b4f3a'; // Brown
    ctx.fillRect(0, 0, 10, 30);
    // Guard
    ctx.fillStyle = '#555';
    ctx.fillRect(-5, 0, 20, 5);

    // Blade
    ctx.fillStyle = '#c0c0c0'; // Silver
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(5, -40);
    ctx.lineTo(10, -35);
    ctx.lineTo(10, 0);
    ctx.closePath();
    ctx.fill();
    
    // Blade highlight
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(5, -40);
    ctx.lineTo(7, -38);
    ctx.lineTo(7, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    
    // Slash swoosh effect
    if (slashAnimTimer.current > 1) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * slashProgress})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(SCREEN_WIDTH / 2 + 10, SCREEN_HEIGHT, 80, -Math.PI * 0.6, -Math.PI * 0.4);
      ctx.stroke();
    }
  };

  const renderGame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const player = playerRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Ceiling
    ctx.fillStyle = '#87CEFA'; // Light Sky Blue
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT / 2);

    // Floor based on player's Y position
    if (player.posY > 12.5) {
      // Beach area
      ctx.fillStyle = '#f0e68c'; // Khaki sand
      ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
    } else if (player.posY > 7.5) {
      // Street area
      ctx.fillStyle = '#4b5563'; // Gray-600 for asphalt
      ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
    } else {
      // City/Park area
      ctx.fillStyle = '#166534'; // Dark green for grass/dirt
      ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
    }
    
    for (let x = 0; x < SCREEN_WIDTH; x++) {
      const cameraX = 2 * x / SCREEN_WIDTH - 1;
      const rayDirX = player.dirX + player.planeX * cameraX;
      const rayDirY = player.dirY + player.planeY * cameraX;

      let mapX = Math.floor(player.posX);
      let mapY = Math.floor(player.posY);

      let sideDistX;
      let sideDistY;

      const deltaDistX = Math.abs(1 / rayDirX);
      const deltaDistY = Math.abs(1 / rayDirY);
      let perpWallDist;

      let stepX;
      let stepY;

      let hit = 0;
      let side = 0;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (player.posX - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - player.posX) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (player.posY - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - player.posY) * deltaDistY;
      }
      
      while (hit === 0) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }
        if (worldMap[mapY][mapX] > 0) hit = 1;
      }

      if (side === 0) {
        perpWallDist = (mapX - player.posX + (1 - stepX) / 2) / rayDirX;
      } else {
        perpWallDist = (mapY - player.posY + (1 - stepY) / 2) / rayDirY;
      }
      
      zBuffer.current[x] = perpWallDist;

      const lineHeight = Math.floor(SCREEN_HEIGHT / perpWallDist);

      let drawStart = -lineHeight / 2 + SCREEN_HEIGHT / 2;
      if (drawStart < 0) drawStart = 0;
      let drawEnd = lineHeight / 2 + SCREEN_HEIGHT / 2;
      if (drawEnd >= SCREEN_HEIGHT) drawEnd = SCREEN_HEIGHT - 1;

      const wallType = worldMap[mapY][mapX];
      let color;
      switch (wallType) {
        case 1: color = '#6b7280'; break; // Border (gray-500)
        case 2: color = '#713f12'; break; // Concrete (brown-800)
        case 3: color = '#166534'; break; // Old Park Wall (green-800)
        case 4: color = '#f59e0b'; break; // Sand Dune (amber-500)
        case 5: color = '#b91c1c'; break; // Brick (red-700)
        case 6: color = '#7dd3fc'; break; // Window (sky-300)
        case 7: color = '#a16207'; break; // Wood Pier (yellow-700)
        case 8: color = '#15803d'; break; // Bushes (green-700)
        default: color = '#a855f7'; break; // Default (purple-500)
      }

      // Darken walls on Y-axis for a cheap lighting effect, but not windows
      if (side === 1 && wallType !== 6) {
        const r = parseInt(color.slice(1, 3), 16) * 0.7;
        const g = parseInt(color.slice(3, 5), 16) * 0.7;
        const b = parseInt(color.slice(5, 7), 16) * 0.7;
        color = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
    }
    
    // --- SPRITE CASTING ---
    const sprites = spritesRef.current;
    const spriteOrder = Array.from(Array(sprites.length).keys());
    const spriteDistance = sprites.map(sprite => 
        ((player.posX - sprite.x) ** 2 + (player.posY - sprite.y) ** 2)
    );

    spriteOrder.sort((a, b) => spriteDistance[b] - spriteDistance[a]);

    for (let i = 0; i < sprites.length; i++) {
        const s = sprites[spriteOrder[i]];
        if (s.state === 'dead') continue;
        if (s.type === 'enemy' && s.state === 'idle' && spriteDistance[spriteOrder[i]] > ENEMY_DETECTION_RANGE ** 2) continue;

        const spriteX = s.x - player.posX;
        const spriteY = s.y - player.posY;

        const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);

        const transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
        const transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);

        if (transformY <= 0) continue;

        const spriteScreenX = Math.floor((SCREEN_WIDTH / 2) * (1 + transformX / transformY));
        const spriteHeight = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
        
        let drawStartY = Math.floor(-spriteHeight / 2 + SCREEN_HEIGHT / 2);
        if (drawStartY < 0) drawStartY = 0;
        let drawEndY = Math.floor(spriteHeight / 2 + SCREEN_HEIGHT / 2);
        if (drawEndY >= SCREEN_HEIGHT) drawEndY = SCREEN_HEIGHT - 1;

        const spriteWidth = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
        let drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
        if (drawStartX < 0) drawStartX = 0;
        let drawEndX = Math.floor(spriteWidth / 2 + spriteScreenX);
        if (drawEndX >= SCREEN_WIDTH) drawEndX = SCREEN_WIDTH - 1;
        
        for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
            if (transformY < zBuffer.current[stripe]) {
                if (s.type === 'enemy') {
                    if (s.state === 'dying') {
                        const deathProgress = 1 - (s.deathTimer! / ENEMY_DEATH_ANIM_DURATION);
                        const fallAmount = deathProgress * spriteHeight;
                        const fadeAmount = 1 - deathProgress;

                        // Draw collapsing pixels
                        const headHeight = Math.floor(spriteHeight * 0.3);
                        const headFall = fallAmount * 1.5;
                        ctx.fillStyle = `rgba(210, 180, 140, ${fadeAmount})`; // Fading tan
                        ctx.fillRect(stripe, drawStartY + headFall, 1, headHeight);
                        
                        const torsoHeight = spriteHeight * 0.5;
                        const torsoFall = fallAmount;
                        ctx.fillStyle = `rgba(0, 100, 0, ${fadeAmount})`; // Fading dark green
                        ctx.fillRect(stripe, drawStartY + headHeight + torsoFall, 1, torsoHeight);

                    } else {
                        const bob = s.state === 'chasing' 
                            ? Math.sin(gameTick.current * 0.2) * 2
                            : Math.sin(gameTick.current * 0.05) * 1;
                        
                        const headHeight = Math.floor(spriteHeight * 0.3);
                        const torsoHeight = Math.floor(spriteHeight * 0.5);
                        const legsHeight = spriteHeight - headHeight - torsoHeight;

                        const headStartY = drawStartY + bob;
                        const torsoStartY = drawStartY + headHeight + bob;
                        const legsStartY = drawStartY + headHeight + torsoHeight;

                        // Draw head (tan)
                        ctx.fillStyle = '#D2B48C';
                        ctx.fillRect(stripe, headStartY, 1, headHeight);

                        // Draw torso (dark green shirt)
                        ctx.fillStyle = '#006400';
                        ctx.fillRect(stripe, torsoStartY, 1, torsoHeight);

                        // Draw legs (dark blue pants)
                        ctx.fillStyle = '#00008B';
                        ctx.fillRect(stripe, legsStartY, 1, legsHeight);
                    }
                } else if (s.type === 'medkit' && s.state === 'idle') {
                    const boxHeight = Math.floor(spriteHeight * 0.6);
                    const boxStartY = drawStartY + spriteHeight * 0.2;
                    const crossThickness = Math.max(1, Math.floor(spriteWidth * 0.2));
                    
                    const stripeRelativeX = stripe - drawStartX;

                    const isVerticalBar = stripeRelativeX > (spriteWidth / 2 - crossThickness / 2) && 
                                            stripeRelativeX < (spriteWidth / 2 + crossThickness / 2);

                    // draw green box bg
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(stripe, boxStartY, 1, boxHeight);
                    
                    // draw cross
                    ctx.fillStyle = 'white';
                    if (isVerticalBar) {
                        ctx.fillRect(stripe, boxStartY, 1, boxHeight);
                    } else {
                        const horizontalBarY = boxStartY + boxHeight / 2 - crossThickness / 2;
                        ctx.fillRect(stripe, horizontalBarY, 1, crossThickness);
                    }
                }
            }
        }
        
        // Draw sprite UI (health bar and name for enemies)
        if (s.type === 'enemy' && transformY > 0 && s.state !== 'dying' && transformY < zBuffer.current[Math.floor(spriteScreenX)] ) {
          const healthBarWidth = 30;
          const healthBarHeight = 4;
          const healthBarX = spriteScreenX - healthBarWidth / 2;
          const healthBarY = drawStartY - 15;

          // Health bar background
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

          // Current health
          const currentHealthPercentage = Math.max(0, s.health! / ENEMY_HEALTH);
          const currentHealthWidth = healthBarWidth * currentHealthPercentage;
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(healthBarX, healthBarY, currentHealthWidth, healthBarHeight);
          
          // Border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

          // Name
          ctx.fillStyle = 'white';
          ctx.font = '10px "Courier New"';
          ctx.textAlign = 'center';
          ctx.fillText(s.name!.toUpperCase(), spriteScreenX, drawStartY - 5);
        }
    }
    
    // Draw joystick
    if (joystickCenter.current && joystickPos.current) {
      // Base
      ctx.beginPath();
      ctx.arc(joystickCenter.current.x, joystickCenter.current.y, JOYSTICK_BASE_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
      ctx.fill();

      // Handle
      ctx.beginPath();
      ctx.arc(joystickPos.current.x, joystickPos.current.y, JOYSTICK_HANDLE_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(192, 192, 192, 0.7)';
      ctx.fill();
    }
    
    // --- Draw Mobile Buttons ---

    // Weapon switch button
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(WEAPON_SWITCH_BUTTON_X, WEAPON_SWITCH_BUTTON_Y, WEAPON_SWITCH_BUTTON_WIDTH, WEAPON_SWITCH_BUTTON_HEIGHT);
    ctx.font = '24px "Courier New"';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', WEAPON_SWITCH_BUTTON_X + WEAPON_SWITCH_BUTTON_WIDTH / 2, WEAPON_SWITCH_BUTTON_Y + WEAPON_SWITCH_BUTTON_HEIGHT / 2 + 2);

    // Reload Button
    if (player.weapon === 'gun') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(RELOAD_BUTTON_X, RELOAD_BUTTON_Y, RELOAD_BUTTON_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = '10px "Courier New"';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RELOAD', RELOAD_BUTTON_X, RELOAD_BUTTON_Y);
    }
    
    // Shoot Button
    ctx.fillStyle = shootTouchId.current !== null ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(SHOOT_BUTTON_X, SHOOT_BUTTON_Y, SHOOT_BUTTON_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = '12px "Courier New"';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHOOT', SHOOT_BUTTON_X, SHOOT_BUTTON_Y);
    
    const isDead = playerStateRef.current === 'dead';

    // Damage Flash (only when alive)
    if (!isDead && damageFlashTimer.current > 0) {
        const alpha = (damageFlashTimer.current / 10) * 0.5;
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    // Spawn Immunity Flash (only when alive)
    if (!isDead && player.isImmune && gameTick.current % 20 < 10) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, SCREEN_WIDTH - 4, SCREEN_HEIGHT - 4);
    }

    // Death Screen (if dead)
    if (isDead) {
        ctx.fillStyle = 'rgba(150, 0, 0, 0.5)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        ctx.font = '40px "Courier New", Courier, monospace';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);
        const respawnSeconds = Math.ceil(playerRespawnTimer.current / 60);
        ctx.font = '20px "Courier New", Courier, monospace';
        ctx.fillText(`Respawning in ${respawnSeconds}...`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);
        return; // Don't draw weapons or HUD
    }


    // --- Draw Weapon ---
    if (isSwitchingWeapon.current) {
        const progress = 1 - (weaponSwitchTimer.current / WEAPON_SWITCH_DURATION);
        const easedProgress = easeInOutQuad(progress);
        const yOffset = 100; // How far the weapon moves down

        const outY = easedProgress * yOffset;
        const inY = (1 - easedProgress) * yOffset;

        // Draw outgoing weapon
        if (previousWeapon.current === 'gun') {
            drawGun(ctx, outY);
        } else {
            drawKnife(ctx, outY);
        }

        // Draw incoming weapon
        if (player.weapon === 'gun') {
            drawGun(ctx, inY);
        } else {
            drawKnife(ctx, inY);
        }
    } else {
        if (player.weapon === 'gun') {
            drawGun(ctx);
        } else {
            drawKnife(ctx);
        }
    }
    drawHud(ctx, player);

  }, []);
  
  const respawnPlayer = useCallback(() => {
    const player = playerRef.current;
    player.posX = 10.5;
    player.posY = 10.5;
    player.dirX = -1;
    player.dirY = 0;
    player.planeX = 0;
    player.planeY = 0.66;
    player.health = PLAYER_MAX_HEALTH;
    player.ammo = MAX_AMMO;
    player.isImmune = true;
    player.immunityTimer = SPAWN_IMMUNITY_DURATION;
    playerStateRef.current = 'alive';
  }, []);

  const updateSprites = useCallback(() => {
    const player = playerRef.current;
    
    spritesRef.current.forEach((sprite) => {
      if (sprite.type === 'enemy' && sprite.attackCooldown! > 0) sprite.attackCooldown!--;
      
      switch (sprite.state) {
        case 'dying':
          sprite.deathTimer!--;
          if (sprite.deathTimer! <= 0) {
            sprite.state = 'dead';
            sprite.respawnTimer = ENEMY_RESPAWN_TIME;
          }
          break;
        case 'dead':
          sprite.respawnTimer--;
          if (sprite.respawnTimer <= 0) {
            sprite.state = 'idle';
            sprite.x = sprite.initialX;
            sprite.y = sprite.initialY;
            if (sprite.type === 'enemy') {
                sprite.health = ENEMY_HEALTH;
            } else if (sprite.type === 'medkit') {
                sprite.respawnTimer = MEDKIT_RESPAWN_TIME;
            }
          }
          break;
        case 'chasing':
        case 'idle':
          if (sprite.type === 'enemy') {
            const dist = Math.sqrt((player.posX - sprite.x)**2 + (player.posY - sprite.y)**2);
            
            if (dist < ENEMY_DETECTION_RANGE && dist > 1) {
              sprite.state = 'chasing';
            } else {
              sprite.state = 'idle';
            }
            
            if (sprite.state === 'chasing') {
              const moveX = (player.posX - sprite.x) / dist * ENEMY_SPEED;
              const moveY = (player.posY - sprite.y) / dist * ENEMY_SPEED;
              
              if(worldMap[Math.floor(sprite.y)][Math.floor(sprite.x + moveX)] === 0) {
                  sprite.x += moveX;
              }
              if(worldMap[Math.floor(sprite.y + moveY)][Math.floor(sprite.x)] === 0) {
                  sprite.y += moveY;
              }
               // ATTACK LOGIC
              if (dist < ENEMY_ATTACK_RANGE && sprite.attackCooldown! <= 0 && playerStateRef.current === 'alive') {
                  sprite.attackCooldown = ENEMY_ATTACK_RATE;
                  if (!player.isImmune) {
                      player.health -= ENEMY_DAMAGE;
                      damageFlashTimer.current = 10;
                      audio.playPlayerHit();

                      if (player.health <= 0) {
                          player.health = 0;
                          playerStateRef.current = 'dead';
                          playerRespawnTimer.current = PLAYER_RESPAWN_TIME;
                          audio.playPlayerDeath();
                      }
                  }
              }
            }
          }
          break;
      }
    });
  }, []);

  const updatePlayerState = useCallback(() => {
    const player = playerRef.current;
    const keys = keysPressed.current;
    
    gameTick.current++;
    isMoving.current = false;
    
    // Update timers
    if (shootCooldown.current > 0) shootCooldown.current--;
    if (slashCooldown.current > 0) slashCooldown.current--;
    if (shootAnimTimer.current > 0) shootAnimTimer.current--;
    if (slashAnimTimer.current > 0) slashAnimTimer.current--;
    if (recoilOffset.current > 0) recoilOffset.current *= 0.7; // Dampen recoil
    if (damageFlashTimer.current > 0) damageFlashTimer.current--;
    if (emptyClickCooldown.current > 0) emptyClickCooldown.current--;
    if (emptyGunAnimTimer.current > 0) emptyGunAnimTimer.current--;
    if (ammoFlashTimer.current > 0) ammoFlashTimer.current--;

    if (player.isImmune) {
      player.immunityTimer--;
      if (player.immunityTimer <= 0) {
        player.isImmune = false;
      }
    }

    // Update weapon switch timer
    if (isSwitchingWeapon.current) {
      weaponSwitchTimer.current--;
      if (weaponSwitchTimer.current <= 0) {
        isSwitchingWeapon.current = false;
      }
    }

    // Handle reloading
    if (isReloading.current) {
      reloadTimer.current--;
      if (reloadTimer.current <= 0) {
        isReloading.current = false;
        player.ammo = player.maxAmmo;
      }
    } else if (keys['r'] && player.weapon === 'gun' && player.ammo < player.maxAmmo && !isReloading.current && !isSwitchingWeapon.current) {
      isReloading.current = true;
      reloadTimer.current = RELOAD_TIME;
      audio.playReload();
    }

    // Keyboard Movement
    if (keys['w'] || keys['s'] || keys['a'] || keys['d']) {
        isMoving.current = true;
    }
    if (keys['w']) {
      if (worldMap[Math.floor(player.posY)][Math.floor(player.posX + player.dirX * MOVE_SPEED)] === 0) {
        player.posX += player.dirX * MOVE_SPEED;
      }
      if (worldMap[Math.floor(player.posY + player.dirY * MOVE_SPEED)][Math.floor(player.posX)] === 0) {
        player.posY += player.dirY * MOVE_SPEED;
      }
    }
    if (keys['s']) {
      if (worldMap[Math.floor(player.posY)][Math.floor(player.posX - player.dirX * MOVE_SPEED)] === 0) {
        player.posX -= player.dirX * MOVE_SPEED;
      }
      if (worldMap[Math.floor(player.posY - player.dirY * MOVE_SPEED)][Math.floor(player.posX)] === 0) {
        player.posY -= player.dirY * MOVE_SPEED;
      }
    }
     if (keys['a']) {
      if (worldMap[Math.floor(player.posY)][Math.floor(player.posX - player.planeX * MOVE_SPEED)] === 0) {
        player.posX -= player.planeX * MOVE_SPEED;
      }
      if (worldMap[Math.floor(player.posY - player.planeY * MOVE_SPEED)][Math.floor(player.posX)] === 0) {
        player.posY -= player.planeY * MOVE_SPEED;
      }
    }
    if (keys['d']) {
       if (worldMap[Math.floor(player.posY)][Math.floor(player.posX + player.planeX * MOVE_SPEED)] === 0) {
        player.posX += player.planeX * MOVE_SPEED;
      }
      if (worldMap[Math.floor(player.posY + player.planeY * MOVE_SPEED)][Math.floor(player.posX)] === 0) {
        player.posY += player.planeY * MOVE_SPEED;
      }
    }

    // Medkit pickup logic
    spritesRef.current.forEach(sprite => {
        if (sprite.type === 'medkit' && sprite.state === 'idle') {
            const dist = Math.sqrt((player.posX - sprite.x)**2 + (player.posY - sprite.y)**2);
            if (dist < MEDKIT_PICKUP_RANGE && player.health < player.maxHealth) {
                sprite.state = 'dead';
                sprite.respawnTimer = MEDKIT_RESPAWN_TIME;
                player.health = Math.min(player.maxHealth, player.health + MEDKIT_HEAL_AMOUNT);
                audio.playMedkitPickup();
            }
        }
    });

    if (isMoving.current && gameTick.current % 20 === 0) {
      audio.playFootstep();
    }

    // Touch Movement
    if (leftTouchId.current !== null && joystickCenter.current && joystickPos.current) {
      const joyDX = joystickPos.current.x - joystickCenter.current.x;
      const joyDY = joystickPos.current.y - joystickCenter.current.y;
      const joyDist = Math.sqrt(joyDX * joyDX + joyDY * joyDY);

      if (joyDist > JOYSTICK_HANDLE_RADIUS / 4) { // Dead zone
        isMoving.current = true;
        const moveFactor = Math.min(joyDist / JOYSTICK_BASE_RADIUS, 1.0);
        const normalizedJoyDX = joyDX / joyDist;
        const normalizedJoyDY = joyDY / joyDist;

        const forwardAmount = -normalizedJoyDY * moveFactor * MOVE_SPEED * 1.5;
        const strafeAmount = normalizedJoyDX * moveFactor * MOVE_SPEED * 1.5;

        const totalMoveX = player.dirX * forwardAmount + player.planeX * strafeAmount;
        const totalMoveY = player.dirY * forwardAmount + player.planeY * strafeAmount;

        if (worldMap[Math.floor(player.posY)][Math.floor(player.posX + totalMoveX)] === 0) {
          player.posX += totalMoveX;
        }
        if (worldMap[Math.floor(player.posY + totalMoveY)][Math.floor(player.posX)] === 0) {
          player.posY += totalMoveY;
        }
      }
    }
    
    // Weapon Switching
    if (keys['1']) {
      handleWeaponSwitch('gun');
    }
    if (keys['q']) {
      handleWeaponSwitch('knife');
    }

    // Attack logic
    const wantsToAttack = (keys[' '] || shootTouchId.current !== null) && !isSwitchingWeapon.current;
    if (wantsToAttack) {
      if (player.weapon === 'gun' && !isReloading.current) {
        if (player.ammo > 0 && shootCooldown.current === 0) {
            player.ammo--;
            shootCooldown.current = FIRE_RATE;
            shootAnimTimer.current = 3; 
            recoilOffset.current = 10;
            audio.playGunshot();

            // Gun hit detection
            let closestSprite = -1;
            let minSpriteDist = Infinity;
            
            spritesRef.current.forEach((sprite, index) => {
                if (sprite.type !== 'enemy' || sprite.state === 'dying' || sprite.state === 'dead') return;

                const spriteX = sprite.x - player.posX;
                const spriteY = sprite.y - player.posY;
                const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
                const transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);
                
                if(transformY > 0){
                    const transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
                    const spriteScreenX = Math.floor((SCREEN_WIDTH / 2) * (1 + transformX / transformY));
                    const spriteWidth = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
                    const distToCenter = Math.abs(spriteScreenX - SCREEN_WIDTH / 2);
                    
                    if (distToCenter < spriteWidth / 2 && transformY < minSpriteDist) {
                        minSpriteDist = transformY;
                        closestSprite = index;
                    }
                }
            });

            if (closestSprite !== -1) {
                const target = spritesRef.current[closestSprite];
                target.health! -= GUN_DAMAGE;
                if(target.health! <= 0) {
                    target.state = 'dying';
                    target.deathTimer = ENEMY_DEATH_ANIM_DURATION;
                    player.score += SCORE_PER_KILL;
                    onScoreChange(player.score);
                    audio.playEnemyDeath();
                } else {
                    audio.playEnemyHit();
                }
            }
        } else if (player.ammo <= 0 && emptyClickCooldown.current === 0) {
            // Dry fire animation and sound
            emptyClickCooldown.current = FIRE_RATE;
            audio.playEmptyClick();
            emptyGunAnimTimer.current = 10;
            ammoFlashTimer.current = 30;
        }

      } else if (player.weapon === 'knife' && slashCooldown.current === 0) {
        slashCooldown.current = MELEE_RATE;
        slashAnimTimer.current = MELEE_RATE / 4; 
        audio.playKnifeSlash();
        
        const killedSprites: Sprite[] = [];
        const hitSprites: Sprite[] = [];

        spritesRef.current.forEach(sprite => {
            if (sprite.type !== 'enemy' || sprite.state === 'dying' || sprite.state === 'dead') return;
            const dist = Math.sqrt((player.posX - sprite.x)**2 + (player.posY - sprite.y)**2);
            if (dist < KNIFE_RANGE) {
                if (sprite.health! - KNIFE_DAMAGE <= 0) {
                    killedSprites.push(sprite);
                } else {
                    hitSprites.push(sprite);
                }
            }
        });

        if (killedSprites.length > 0) {
            let scoreGained = 0;
            killedSprites.forEach(sprite => {
                if (sprite.state !== 'dying' && sprite.state !== 'dead') {
                    sprite.health! -= KNIFE_DAMAGE;
                    sprite.state = 'dying';
                    sprite.deathTimer = ENEMY_DEATH_ANIM_DURATION;
                    scoreGained += SCORE_PER_KILL;
                }
            });
            if (scoreGained > 0) {
                player.score += scoreGained;
                onScoreChange(player.score);
            }
            audio.playEnemyDeath();
        } else if (hitSprites.length > 0) {
            hitSprites.forEach(sprite => {
                sprite.health! -= KNIFE_DAMAGE;
            });
            audio.playEnemyHit();
        }
      }
    }

    // Keyboard Rotation
    if (keys['arrowright']) {
      const oldDirX = player.dirX;
      player.dirX = player.dirX * Math.cos(-ROTATION_SPEED) - player.dirY * Math.sin(-ROTATION_SPEED);
      player.dirY = oldDirX * Math.sin(-ROTATION_SPEED) + player.dirY * Math.cos(-ROTATION_SPEED);
      const oldPlaneX = player.planeX;
      player.planeX = player.planeX * Math.cos(-ROTATION_SPEED) - player.planeY * Math.sin(-ROTATION_SPEED);
      player.planeY = oldPlaneX * Math.sin(-ROTATION_SPEED) + player.planeY * Math.cos(-ROTATION_SPEED);
    }
    if (keys['arrowleft']) {
      const oldDirX = player.dirX;
      player.dirX = player.dirX * Math.cos(ROTATION_SPEED) - player.dirY * Math.sin(ROTATION_SPEED);
      player.dirY = oldDirX * Math.sin(ROTATION_SPEED) + player.dirY * Math.cos(ROTATION_SPEED);
      const oldPlaneX = player.planeX;
      player.planeX = player.planeX * Math.cos(ROTATION_SPEED) - player.planeY * Math.sin(ROTATION_SPEED);
      player.planeY = oldPlaneX * Math.sin(ROTATION_SPEED) + player.planeY * Math.cos(ROTATION_SPEED);
    }

    // Touch Rotation
    const lookDamping = 0.75; // A value between 0-1. Higher means less friction.
    if (rightTouchId.current !== null || Math.abs(lookDeltaX.current) > 0.1) {
        const rotation = lookDeltaX.current * TOUCH_LOOK_SENSITIVITY;
        const oldDirX = player.dirX;
        player.dirX = player.dirX * Math.cos(-rotation) - player.dirY * Math.sin(-rotation);
        player.dirY = oldDirX * Math.sin(-rotation) + player.dirY * Math.cos(-rotation);
        const oldPlaneX = player.planeX;
        player.planeX = player.planeX * Math.cos(-rotation) - player.planeY * Math.sin(-rotation);
        player.planeY = oldPlaneX * Math.sin(-rotation) + player.planeY * Math.cos(-rotation);

        if (rightTouchId.current !== null) {
            // While touching, we reset the delta each frame so it only contains the latest movement
            lookDeltaX.current = 0;
        } else {
            // After letting go, we apply damping to the last movement for a smooth stop
            lookDeltaX.current *= lookDamping;
        }
    }
  }, [onScoreChange, handleWeaponSwitch]);

  const gameLoop = useCallback(() => {
    if (playerStateRef.current === 'dead') {
      playerRespawnTimer.current--;
      if (playerRespawnTimer.current <= 0) {
        respawnPlayer();
      }
    } else {
      updatePlayerState();
      updateSprites();
    }
    renderGame();
  }, [renderGame, updatePlayerState, updateSprites, respawnPlayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasInteracted.current) {
        audio.resumeAudioContext();
        audio.startBackgroundMusic();
        hasInteracted.current = true;
      }
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (!hasInteracted.current) {
        audio.resumeAudioContext();
        audio.startBackgroundMusic();
        hasInteracted.current = true;
      }
      if (playerStateRef.current === 'dead') return;

      const rect = canvas.getBoundingClientRect();
      for (const touch of Array.from(e.changedTouches)) {
        const touchX = (touch.clientX - rect.left) / rect.width * SCREEN_WIDTH;
        const touchY = (touch.clientY - rect.top) / rect.height * SCREEN_HEIGHT;

        // Left side for joystick
        if (touchX < SCREEN_WIDTH * JOYSTICK_AREA_WIDTH_RATIO && leftTouchId.current === null) {
          leftTouchId.current = touch.identifier;
          joystickCenter.current = { x: touchX, y: touchY };
          joystickPos.current = { ...joystickCenter.current };
        } 
        // Right side for actions
        else if (touchX >= SCREEN_WIDTH * JOYSTICK_AREA_WIDTH_RATIO) {
          // Check for weapon switch button tap (top-right)
          if (touchX > WEAPON_SWITCH_BUTTON_X && touchX < WEAPON_SWITCH_BUTTON_X + WEAPON_SWITCH_BUTTON_WIDTH &&
              touchY > WEAPON_SWITCH_BUTTON_Y && touchY < WEAPON_SWITCH_BUTTON_Y + WEAPON_SWITCH_BUTTON_HEIGHT) {
                handleWeaponSwitch(playerRef.current.weapon === 'gun' ? 'knife' : 'gun');
                continue; 
          }
          
          // Check for reload button tap
          if (playerRef.current.weapon === 'gun') {
            const reloadDist = Math.sqrt((touchX - RELOAD_BUTTON_X)**2 + (touchY - RELOAD_BUTTON_Y)**2);
            if (reloadDist < RELOAD_BUTTON_RADIUS) {
              if (playerRef.current.ammo < playerRef.current.maxAmmo && !isReloading.current && !isSwitchingWeapon.current) {
                isReloading.current = true;
                reloadTimer.current = RELOAD_TIME;
                audio.playReload();
              }
              continue;
            }
          }
          
          // Check for shoot button press
          const shootDist = Math.sqrt((touchX - SHOOT_BUTTON_X)**2 + (touchY - SHOOT_BUTTON_Y)**2);
          if (shootDist < SHOOT_BUTTON_RADIUS && shootTouchId.current === null) {
            shootTouchId.current = touch.identifier;
            continue;
          }

          // If no button was hit and no other touch is looking, this one is for looking
          if (rightTouchId.current === null) {
            rightTouchId.current = touch.identifier;
            lookStart.current = { x: touchX, y: touchY };
            lookDeltaX.current = 0;
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (playerStateRef.current === 'dead') return;

      const rect = canvas.getBoundingClientRect();
      for (const touch of Array.from(e.changedTouches)) {
        const touchX = (touch.clientX - rect.left) / rect.width * SCREEN_WIDTH;
        const touchY = (touch.clientY - rect.top) / rect.height * SCREEN_HEIGHT;
        if (touch.identifier === leftTouchId.current && joystickCenter.current) {
          const dx = touchX - joystickCenter.current.x;
          const dy = touchY - joystickCenter.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > JOYSTICK_BASE_RADIUS) {
            joystickPos.current = {
              x: joystickCenter.current.x + dx / dist * JOYSTICK_BASE_RADIUS,
              y: joystickCenter.current.y + dy / dist * JOYSTICK_BASE_RADIUS,
            };
          } else {
            joystickPos.current = { x: touchX, y: touchY };
          }
        } else if (touch.identifier === rightTouchId.current && lookStart.current) {
          const dx = touchX - lookStart.current.x;
          lookDeltaX.current += dx;
          lookStart.current = { x: touchX, y: touchY };
        }
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === leftTouchId.current) {
          leftTouchId.current = null;
          joystickCenter.current = null;
          joystickPos.current = null;
        } else if (touch.identifier === rightTouchId.current) {
          rightTouchId.current = null;
          lookStart.current = null;
        } else if (touch.identifier === shootTouchId.current) {
          shootTouchId.current = null;
        }
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    if (!isPaused) {
        gameLoopRef.current = window.setInterval(gameLoop, 1000 / 60);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameLoop, isPaused, handleWeaponSwitch, respawnPlayer]);

  return (
    <canvas
      ref={canvasRef}
      width={SCREEN_WIDTH}
      height={SCREEN_HEIGHT}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated', touchAction: 'none' }}
    />
  );
};

export default GameCanvas;
