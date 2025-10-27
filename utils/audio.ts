// utils/audio.ts

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicInterval: number | null = null;
let musicOscillator: OscillatorNode | null = null;

const getAudioContext = (): AudioContext | null => {
  if (audioContext) return audioContext;
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.3, audioContext.currentTime); // Master volume at 30%
    masterGain.connect(audioContext.destination);
  } catch (e) {
    console.error("Web Audio API is not supported in this browser");
    return null;
  }
  return audioContext;
};

// Function to resume context on user gesture
export const resumeAudioContext = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
};

export const setMuted = (muted: boolean) => {
    if (masterGain && audioContext) {
        const targetVolume = muted ? 0 : 0.3;
        // Use a ramp for a smoother transition
        masterGain.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.1);
    }
}

export const startBackgroundMusic = () => {
    if (musicInterval !== null || musicOscillator !== null) return; // Music is already playing

    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0.1, ctx.currentTime); // Music volume lower than sfx
    musicGain.connect(masterGain);

    musicOscillator = ctx.createOscillator();
    musicOscillator.type = 'sawtooth';
    musicOscillator.connect(musicGain);

    const sequence = [65.41, 65.41, 98.00, 82.41]; // C2, C2, G2, D#2
    let noteIndex = 0;

    const playNote = () => {
        if (!ctx || !musicOscillator) return;
        const freq = sequence[noteIndex % sequence.length];
        musicOscillator.frequency.setValueAtTime(freq, ctx.currentTime);
        noteIndex++;
    };

    musicOscillator.start();
    playNote(); 
    musicInterval = window.setInterval(playNote, 300);
};

export const stopBackgroundMusic = () => {
    if (musicInterval) {
        window.clearInterval(musicInterval);
        musicInterval = null;
    }
    if (musicOscillator) {
        try {
            musicOscillator.stop();
        } catch(e) {
            // Oscillator may already be stopped
        }
        musicOscillator.disconnect();
        musicOscillator = null;
    }
};

const playNoise = (duration: number, frequency: number, type: OscillatorType = 'sine', volume: number = 1) => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
};

const playWhiteNoise = (duration: number, volume: number = 1) => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    noiseNode.connect(gainNode);
    gainNode.connect(masterGain);

    noiseNode.start();
};

export const playGunshot = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    playWhiteNoise(0.15, 0.4);
};

export const playFootstep = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    playNoise(0.1, 80, 'square', 0.1);
};

export const playReload = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    
    // Two clicks
    playNoise(0.05, 400, 'triangle', 0.3);
    setTimeout(() => {
        playNoise(0.05, 500, 'triangle', 0.3);
    }, 150);
};

export const playWeaponSwitch = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    playNoise(0.08, 800, 'triangle', 0.2);
};

export const playKnifeSlash = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    playWhiteNoise(0.1, 0.2);
};

export const playEnemyHit = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    playNoise(0.1, 200, 'sawtooth', 0.4);
};

export const playEnemyDeath = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);

    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
};

export const playPlayerHit = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    playNoise(0.15, 150, 'sawtooth', 0.5);
};

export const playPlayerDeath = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);

    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
};

export const playMedkitPickup = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    
    // Ascending notes for a positive sound
    playNoise(0.05, 523.25, 'sine', 0.4); // C5
    setTimeout(() => {
        playNoise(0.1, 783.99, 'sine', 0.4); // G5
    }, 80);
};

export const playEmptyClick = () => {
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;
    playNoise(0.05, 1200, 'triangle', 0.3);
};