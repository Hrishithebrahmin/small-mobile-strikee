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
  GUN_DAMAGE,
  KNIFE_DAMAGE,
  KNIFE_RANGE,
  SCORE_PER_KILL,
  LEADERBOARD_NAMES,
} from '../constants';
import * as audio from '../utils/audio';
import type { Player, Sprite } from '../types';

interface GameCanvasProps {
  onScoreChange: (score: number) => void;
}

// Helper to shuffle array
const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player>({
    posX: 22,
    posY: 12,
    dirX: -1,
    dirY: 0,
    planeX: 0,
    planeY: 0.66,
    ammo: MAX_AMMO,
    maxAmmo: MAX_AMMO,
    score: 0,
    weapon: 'gun',
  });
  const spritesRef = useRef<Sprite[]>(
    initialSprites.map((s, i) => {
      const shuffledNames = shuffleArray([...LEADERBOARD_NAMES]);
      return {
        ...s,
        initialX: s.x,
        initialY: s.y,
        health: ENEMY_HEALTH,
        state: 'idle',
        deathTimer: 0,
        respawnTimer: 0,
        name: shuffledNames[i % shuffledNames.length],
      }
    })
  );
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

  // Touch state refs
  const leftTouchId = useRef<number | null>(null);
  const rightTouchId = useRef<number | null>(null); // For looking
  const shootTouchId = useRef<number | null>(null);
  const joystickCenter = useRef<{ x: number; y: number } | null>(null);
  const joystickPos = useRef<{ x: number; y: number } | null>(null);
  const lookStart = useRef<{ x: number; y: number } | null>(null);
  const lookDeltaX = useRef<number>(0);
  
  const drawHud = (ctx: CanvasRenderingContext2D, player: Player) => {
    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    
    // Score
    const scoreText = `SCORE: ${String(player.score).padStart(6, '0')}`;
    ctx.fillText(scoreText, 10, 20);
    
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
      ctx.fillRect(centerX - 1, centerY - gap - size, 2, size);
      // bottom
      ctx.fillRect(centerX - 1, centerY + gap, 2, size);
      // left
      ctx.fillRect(centerX - gap - size, centerY - 1, size, 2);
      // right
      ctx.fillRect(centerX + gap, centerY - 1, size, 2);
    }
    
    // Ammo - only if gun is equipped
    if (player.weapon === 'gun') {
      ctx.font = '16px "Courier New", Courier, monospace';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'right';
      const ammoText = `AMMO: ${player.ammo}/${player.maxAmmo}`;
      ctx.fillText(ammoText, SCREEN_WIDTH - 10, SCREEN_HEIGHT - 10);
    }
  };

  const drawGun = (ctx: CanvasRenderingContext2D) => {
    const gunBob = isMoving.current ? Math.sin(gameTick.current * GUN_BOB_SPEED) * GUN_BOB_AMOUNT : 0;
    const gunX = SCREEN_WIDTH / 2 - 20;
    const gunY = SCREEN_HEIGHT - 60 + gunBob;
    
    // Gun body
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(gunX, gunY, 40, 20); // main body
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(gunX + 15, gunY + 20, 10, 15); // handle
    
    // Barrel
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(gunX, gunY - 10, 8, 10);

    // Muzzle flash
    if (shootAnimTimer.current > 0) {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.moveTo(gunX + 4, gunY - 10);
        ctx.lineTo(gunX - 5, gunY - 25);
        ctx.lineTo(gunX + 13, gunY - 25);
        ctx.closePath();
        ctx.fill();
    }
  };

  const drawKnife = (ctx: CanvasRenderingContext2D) => {
    const gunBob = isMoving.current ? Math.sin(gameTick.current * GUN_BOB_SPEED) * GUN_BOB_AMOUNT : 0;
    const slashOffset = slashAnimTimer.current > 0 ? 20 : 0;
    const knifeX = SCREEN_WIDTH / 2 + 40 - slashOffset;
    const knifeY = SCREEN_HEIGHT - 60 + gunBob;

    // Handle
    ctx.fillStyle = '#6b4f3a'; // Brown
    ctx.fillRect(knifeX + 5, knifeY, 10, 25);

    // Blade
    ctx.fillStyle = '#c0c0c0'; // Silver
    ctx.beginPath();
    ctx.moveTo(knifeX, knifeY);
    ctx.lineTo(knifeX + 20, knifeY - 20);
    ctx.lineTo(knifeX + 25, knifeY - 15);
    ctx.lineTo(knifeX + 5, knifeY + 5);
    ctx.closePath();
    ctx.fill();
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

    // Floor
    ctx.fillStyle = '#348C31'; // Green
    ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
    
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
        if (worldMap[mapX][mapY] > 0) hit = 1;
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

      const wallType = worldMap[mapX][mapY];
      let color;
      switch (wallType) {
        case 1: color = '#ef4444'; break; // red-500
        case 2: color = '#3b82f6'; break; // blue-500
        case 3: color = '#22c55e'; break; // green-500
        case 4: color = '#eab308'; break; // yellow-500
        default: color = '#a855f7'; break; // purple-500
      }

      if (side === 1) {
        const r = parseInt(color.slice(1, 3), 16) * 0.7;
        const g = parseInt(color.slice(3, 5), 16) * 0.7;
        const b = parseInt(color.slice(5, 7), 16) * 0.7;
        color = `rgb(${r}, ${g}, ${b})`;
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
        if (s.state === 'idle' && spriteDistance[spriteOrder[i]] > ENEMY_DETECTION_RANGE ** 2) continue;

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
                if (s.state === 'dying') {
                    const deathProgress = s.deathTimer / ENEMY_DEATH_ANIM_DURATION;
                    ctx.fillStyle = `rgba(255, 0, 0, ${1 - deathProgress})`;
                } else {
                    ctx.fillStyle = '#008000'; // Green
                }
                ctx.fillRect(stripe, drawStartY, 1, spriteHeight);
            }
        }
        
        // Draw sprite UI (health bar and name)
        if (transformY > 0 && s.state !== 'dying' && transformY < zBuffer.current[Math.floor(spriteScreenX)] ) {
          const healthBarWidth = 30;
          const healthBarHeight = 4;
          const healthBarX = spriteScreenX - healthBarWidth / 2;
          const healthBarY = drawStartY - 15;

          // Health bar background
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

          // Current health
          const currentHealthPercentage = Math.max(0, s.health / ENEMY_HEALTH);
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
          ctx.fillText(s.name.toUpperCase(), spriteScreenX, drawStartY - 5);
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


    if (player.weapon === 'gun') {
        drawGun(ctx);
    } else {
        drawKnife(ctx);
    }
    drawHud(ctx, player);

  }, []);
  
  const updateSprites = useCallback(() => {
    const player = playerRef.current;
    
    spritesRef.current.forEach((sprite) => {
      switch (sprite.state) {
        case 'dying':
          sprite.deathTimer--;
          if (sprite.deathTimer <= 0) {
            sprite.state = 'dead';
            sprite.respawnTimer = ENEMY_RESPAWN_TIME;
          }
          break;
        case 'dead':
          sprite.respawnTimer--;
          if (sprite.respawnTimer <= 0) {
            sprite.state = 'idle';
            sprite.health = ENEMY_HEALTH;
            sprite.x = sprite.initialX;
            sprite.y = sprite.initialY;
          }
          break;
        case 'chasing':
        case 'idle':
          const dist = Math.sqrt((player.posX - sprite.x)**2 + (player.posY - sprite.y)**2);
          
          if (dist < ENEMY_DETECTION_RANGE) {
            sprite.state = 'chasing';
          }
          
          if (sprite.state === 'chasing') {
            const moveX = (player.posX - sprite.x) / dist * ENEMY_SPEED;
            const moveY = (player.posY - sprite.y) / dist * ENEMY_SPEED;
            
            if(worldMap[Math.floor(sprite.x + moveX)][Math.floor(sprite.y)] === 0) {
                sprite.x += moveX;
            }
            if(worldMap[Math.floor(sprite.x)][Math.floor(sprite.y + moveY)] === 0) {
                sprite.y += moveY;
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
    
    // Update cooldowns and animation timers
    if (shootCooldown.current > 0) shootCooldown.current--;
    if (slashCooldown.current > 0) slashCooldown.current--;
    if (shootAnimTimer.current > 0) shootAnimTimer.current--;
    if (slashAnimTimer.current > 0) slashAnimTimer.current--;

    // Handle reloading
    if (isReloading.current) {
      reloadTimer.current--;
      if (reloadTimer.current <= 0) {
        isReloading.current = false;
        player.ammo = player.maxAmmo;
      }
    } else if (keys['r'] && player.weapon === 'gun' && player.ammo < player.maxAmmo && !isReloading.current) {
      isReloading.current = true;
      reloadTimer.current = RELOAD_TIME;
      audio.playReload();
    }

    // Keyboard Movement
    if (keys['w'] || keys['s'] || keys['a'] || keys['d']) {
        isMoving.current = true;
    }
    if (keys['w']) {
      if (worldMap[Math.floor(player.posX + player.dirX * MOVE_SPEED)][Math.floor(player.posY)] === 0) {
        player.posX += player.dirX * MOVE_SPEED;
      }
      if (worldMap[Math.floor(player.posX)][Math.floor(player.posY + player.dirY * MOVE_SPEED)] === 0) {
        player.posY += player.dirY * MOVE_SPEED;
      }
    }
    if (keys['s']) {
      if (worldMap[Math.floor(player.posX - player.dirX * MOVE_SPEED)][Math.floor(player.posY)] === 0) {
        player.posX -= player.dirX * MOVE_SPEED;
      }
      if (worldMap[Math.floor(player.posX)][Math.floor(player.posY - player.dirY * MOVE_SPEED)] === 0) {
        player.posY -= player.dirY * MOVE_SPEED;
      }
    }
     if (keys['a']) {
      if (worldMap[Math.floor(player.posX - player.planeX * MOVE_SPEED)][Math.floor(player.posY)] === 0) {
        player.posX -= player.planeX * MOVE_SPEED;
      }
      if (worldMap[Math.floor(player.posX)][Math.floor(player.posY - player.planeY * MOVE_SPEED)] === 0) {
        player.posY -= player.planeY * MOVE_SPEED;
      }
    }
    if (keys['d']) {
       if (worldMap[Math.floor(player.posX + player.planeX * MOVE_SPEED)][Math.floor(player.posY)] === 0) {
        player.posX += player.planeX * MOVE_SPEED;
      }
      if (worldMap[Math.floor(player.posX)][Math.floor(player.posY + player.planeY * MOVE_SPEED)] === 0) {
        player.posY += player.planeY * MOVE_SPEED;
      }
    }

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

        if (worldMap[Math.floor(player.posX + totalMoveX)][Math.floor(player.posY)] === 0) {
          player.posX += totalMoveX;
        }
        if (worldMap[Math.floor(player.posX)][Math.floor(player.posY + totalMoveY)] === 0) {
          player.posY += totalMoveY;
        }
      }
    }
    
    // Weapon Switching
    if (keys['1'] && player.weapon !== 'gun') {
      player.weapon = 'gun';
      audio.playWeaponSwitch();
    }
    if (keys['q'] && player.weapon !== 'knife') {
      player.weapon = 'knife';
      audio.playWeaponSwitch();
    }

    // Attack logic
    const wantsToAttack = keys[' '] || shootTouchId.current !== null;
    if (wantsToAttack) {
      if (player.weapon === 'gun' && shootCooldown.current === 0 && player.ammo > 0 && !isReloading.current) {
        player.ammo--;
        shootCooldown.current = FIRE_RATE;
        shootAnimTimer.current = 3; 
        audio.playGunshot();

        // Gun hit detection
        let closestSprite = -1;
        let minSpriteDist = Infinity;
        
        spritesRef.current.forEach((sprite, index) => {
            if (sprite.state === 'dying' || sprite.state === 'dead') return;

            const spriteX = sprite.x - player.posX;
            const spriteY = sprite.y - player.posY;
            const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
            const transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);
            
            if(transformY > 0){
                const transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
                const spriteScreenX = Math.floor((SCREEN_WIDTH / 2) * (1 + transformX / transformY));
                const distToCenter = Math.abs(spriteScreenX - SCREEN_WIDTH / 2);
                
                if (distToCenter < minSpriteDist && transformY < zBuffer.current[SCREEN_WIDTH/2]) {
                    minSpriteDist = distToCenter;
                    closestSprite = index;
                }
            }
        });

        if (closestSprite !== -1 && minSpriteDist < 50) { // 50 is arbitrary hit width
            const target = spritesRef.current[closestSprite];
            target.health -= GUN_DAMAGE;
            if(target.health <= 0) {
                target.state = 'dying';
                target.deathTimer = ENEMY_DEATH_ANIM_DURATION;
                player.score += SCORE_PER_KILL;
                onScoreChange(player.score);
                audio.playEnemyDeath();
            } else {
                audio.playEnemyHit();
            }
        }

      } else if (player.weapon === 'knife' && slashCooldown.current === 0) {
        slashCooldown.current = MELEE_RATE;
        slashAnimTimer.current = 5; 
        audio.playKnifeSlash();
        
        const killedSprites: Sprite[] = [];
        const hitSprites: Sprite[] = [];

        spritesRef.current.forEach(sprite => {
            if (sprite.state === 'dying' || sprite.state === 'dead') return;
            const dist = Math.sqrt((player.posX - sprite.x)**2 + (player.posY - sprite.y)**2);
            if (dist < KNIFE_RANGE) {
                if (sprite.health - KNIFE_DAMAGE <= 0) {
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
                    sprite.health -= KNIFE_DAMAGE;
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
                sprite.health -= KNIFE_DAMAGE;
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
    if (rightTouchId.current !== null && lookDeltaX.current !== 0) {
      const rotation = lookDeltaX.current * TOUCH_LOOK_SENSITIVITY;
      const oldDirX = player.dirX;
      player.dirX = player.dirX * Math.cos(-rotation) - player.dirY * Math.sin(-rotation);
      player.dirY = oldDirX * Math.sin(-rotation) + player.dirY * Math.cos(-rotation);
      const oldPlaneX = player.planeX;
      player.planeX = player.planeX * Math.cos(-rotation) - player.planeY * Math.sin(-rotation);
      player.planeY = oldPlaneX * Math.sin(-rotation) + player.planeY * Math.cos(-rotation);
      lookDeltaX.current = 0;
    }
  }, [onScoreChange]);

  const gameLoop = useCallback(() => {
    updatePlayerState();
    updateSprites();
    renderGame();
  }, [renderGame, updatePlayerState, updateSprites]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasInteracted.current) {
        audio.resumeAudioContext();
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
        hasInteracted.current = true;
      }
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
                playerRef.current.weapon = playerRef.current.weapon === 'gun' ? 'knife' : 'gun';
                audio.playWeaponSwitch();
                continue; 
          }
          
          // Check for reload button tap
          if (playerRef.current.weapon === 'gun') {
            const reloadDist = Math.sqrt((touchX - RELOAD_BUTTON_X)**2 + (touchY - RELOAD_BUTTON_Y)**2);
            if (reloadDist < RELOAD_BUTTON_RADIUS) {
              if (playerRef.current.ammo < playerRef.current.maxAmmo && !isReloading.current) {
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

    gameLoopRef.current = window.setInterval(gameLoop, 1000 / 60);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameLoop]);

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