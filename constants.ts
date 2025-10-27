
export const SCREEN_WIDTH = 320;
export const SCREEN_HEIGHT = 200;

export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 24;

// 0: Empty space
// 1: Border Wall (Gray)
// 2: Concrete Building (Dark Brown)
// 3: Park Wall (Dark Green) - Deprecated, use bushes
// 4: Sand Dune (Amber)
// 5: Brick Building (Reddish-Brown)
// 6: Window (Light Blue)
// 7: Wooden Pier (Woody Brown)
// 8: Bushes (Leafy Green)
export const worldMap = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,5,6,5,0,0,0,0,0,0,8,8,8,0,0,2,2,2,2,0,0,1],
  [1,0,0,5,0,5,0,0,0,0,0,0,8,0,8,0,0,2,0,0,0,0,0,1],
  [1,0,0,5,5,5,0,0,0,0,0,0,8,8,8,0,0,2,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,4,4,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,4,4,0,0,1],
  [1,0,4,0,0,0,0,0,0,0,4,0,4,0,0,0,0,0,0,0,4,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];


export const MOVE_SPEED = 0.05;
export const ROTATION_SPEED = 0.03;

export const TOUCH_LOOK_SENSITIVITY = 0.0025;
export const JOYSTICK_BASE_RADIUS = 40;
export const JOYSTICK_HANDLE_RADIUS = 25;
export const JOYSTICK_AREA_WIDTH_RATIO = 0.5; // Left 50% of the screen for joystick

export const MAX_AMMO = 30;
export const GUN_BOB_SPEED = 0.08;
export const GUN_BOB_AMOUNT = 3;
export const FIRE_RATE = 10; // frames cooldown
export const MELEE_RATE = 20; // frames cooldown
export const RELOAD_TIME = 60; // frames (1 second at 60fps)

// Player
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_RESPAWN_TIME = 180; // 3 seconds
export const SPAWN_IMMUNITY_DURATION = 180; // 3 seconds

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
  { x: 4.5, y: 2.5 },   // Inside brick building
  { x: 13.5, y: 3.5 },  // In the park
  { x: 18.5, y: 3.5 },  // Near concrete building
  { x: 8.5, y: 9.5 },   // On the street
  { x: 3.5, y: 14.5 },  // On the beach near pier
  { x: 11.5, y: 15.5 }, // Among the dunes
  { x: 20.5, y: 15.5 }, // Far side of beach
  { x: 15.5, y: 10.5 }, // Another one on the street
];
export const ENEMY_HEALTH = 2;
export const ENEMY_SPEED = 0.02;
export const ENEMY_DETECTION_RANGE = 8.0;
export const ENEMY_DEATH_ANIM_DURATION = 15; // frames
export const ENEMY_RESPAWN_TIME = 600; // 10 seconds at 60fps
export const ENEMY_DAMAGE = 10;
export const ENEMY_ATTACK_RATE = 60; // 1 attack per second
export const ENEMY_ATTACK_RANGE = 1.2;
export const GUN_DAMAGE = 1;
export const KNIFE_DAMAGE = 2;
export const KNIFE_RANGE = 1.5;
export const SCORE_PER_KILL = 1;

// Medkits
export const initialMedkits = [
  { x: 2.5, y: 2.5 },   // Corner of brick building
  { x: 14.5, y: 1.5 },  // In the park
  { x: 17.5, y: 5.5 },  // Alley next to concrete building
  { x: 2.5, y: 15.5 },  // On the beach near pier wall
  { x: 11.5, y: 17.5 }, // Hidden in dunes
];
export const MEDKIT_HEAL_AMOUNT = 50;
export const MEDKIT_RESPAWN_TIME = 900; // 15 seconds
export const MEDKIT_PICKUP_RANGE = 0.8;

export const LEADERBOARD_NAMES = [
  "Vex", "Jynx", "Blitz", "Raze", "Cypher", "Omen", "Breach", "Sova",
  "Skye", "Kayo", "Neon", "Fade", "Gekko", "Deadlock", "Iso", "Clove",
  "Wraith", "Mirage", "Octane", "Revenant", "Loba", "Rampart", "Fuse",
  "Valkyrie", "Ash", "Mad Maggie", "Catalyst", "Conduit"
];
