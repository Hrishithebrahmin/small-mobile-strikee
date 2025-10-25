export const SCREEN_WIDTH = 320;
export const SCREEN_HEIGHT = 200;

export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 24;

export const worldMap = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,2,2,2,2,2,0,0,0,3,0,3,0,3,0,3,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,0,4,4,4,0,2,0,0,0,3,0,3,0,3,0,3,0,0,0,1],
  [1,0,0,2,0,4,0,4,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,0,4,4,4,0,2,0,0,0,3,0,3,0,3,0,3,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,2,2,2,2,2,0,0,0,3,3,3,3,3,3,3,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,4,0,4,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,4,0,0,0,0,5,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,4,0,4,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,4,0,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export const MOVE_SPEED = 0.05;
export const ROTATION_SPEED = 0.03;

export const TOUCH_LOOK_SENSITIVITY = 0.002;
export const JOYSTICK_BASE_RADIUS = 40;
export const JOYSTICK_HANDLE_RADIUS = 25;
export const JOYSTICK_AREA_WIDTH_RATIO = 0.5; // Left 50% of the screen for joystick

export const MAX_AMMO = 30;
export const GUN_BOB_SPEED = 0.08;
export const GUN_BOB_AMOUNT = 3;
export const FIRE_RATE = 10; // frames cooldown
export const MELEE_RATE = 20; // frames cooldown
export const RELOAD_TIME = 60; // frames (1 second at 60fps)

export const WEAPON_SWITCH_BUTTON_X = SCREEN_WIDTH - 40;
export const WEAPON_SWITCH_BUTTON_Y = 10;
export const WEAPON_SWITCH_BUTTON_WIDTH = 30;
export const WEAPON_SWITCH_BUTTON_HEIGHT = 30;

// Mobile controls
export const SHOOT_BUTTON_RADIUS = 35;
export const SHOOT_BUTTON_X = SCREEN_WIDTH - 55;
export const SHOOT_BUTTON_Y = SCREEN_HEIGHT - 55;

export const RELOAD_BUTTON_RADIUS = 25;
export const RELOAD_BUTTON_X = SCREEN_WIDTH - 65;
export const RELOAD_BUTTON_Y = SCREEN_HEIGHT - 120;


// Sprites & Enemies
export const initialSprites = [
  { x: 20.5, y: 11.5 }, { x: 18.5, y: 4.5 }, { x: 10.0, y: 4.5 },
  { x: 10.0, y: 12.5}, { x: 3.5, y: 6.5 },  { x: 3.5, y: 20.5 },
  { x: 3.5, y: 14.5 }, { x: 14.5, y: 20.5}, { x: 17.5, y: 18.5},
  { x: 6.5, y: 17.5},  { x: 6.5, y: 8.5 },
];
export const ENEMY_HEALTH = 2;
export const ENEMY_SPEED = 0.02;
export const ENEMY_DETECTION_RANGE = 8.0;
export const ENEMY_DEATH_ANIM_DURATION = 15; // frames
export const ENEMY_RESPAWN_TIME = 600; // 10 seconds at 60fps
export const GUN_DAMAGE = 1;
export const KNIFE_DAMAGE = 2;
export const KNIFE_RANGE = 1.5;
export const SCORE_PER_KILL = 1;

export const LEADERBOARD_NAMES = [
  "Vex", "Jynx", "Blitz", "Raze", "Cypher", "Omen", "Breach", "Sova",
  "Skye", "Kayo", "Neon", "Fade", "Gekko", "Deadlock", "Iso", "Clove",
  "Wraith", "Mirage", "Octane", "Revenant", "Loba", "Rampart", "Fuse",
  "Valkyrie", "Ash", "Mad Maggie", "Catalyst", "Conduit"
];