// Audio scaffold for Splinterwood.
//
// Architecture:
//  - We lazily create an AudioContext on first user interaction (browsers
//    block playback before any gesture).
//  - The SFX layer is currently SYNTHESIZED (Web Audio oscillators) for
//    placeholder sounds. When real audio files exist, set `useFiles = true`
//    in registerSfx() entries and they'll play instead.
//  - All output runs through master + channel (sfx/music) gain nodes so
//    volume controls are trivial.
//  - Settings persist via localStorage.

export type SfxId =
  | 'click' | 'chop' | 'craft' | 'hit' | 'defeat' | 'player_hit'
  | 'levelup' | 'quest_complete' | 'coin' | 'denied' | 'hire'
  | 'mine' | 'smith';

interface AudioSettings {
  masterEnabled: boolean;
  masterVolume: number;  // 0..1
  sfxVolume: number;     // 0..1
  musicVolume: number;   // 0..1
  musicEnabled: boolean; // separate on/off for music (a player might want sfx on, music off)
}

const SETTINGS_KEY = 'splinterwood_audio_v1';

const defaultSettings: AudioSettings = {
  masterEnabled: true,
  masterVolume: 0.6,
  sfxVolume: 0.8,
  musicVolume: 0.25,
  musicEnabled: true,
};

let _settings: AudioSettings = loadSettings();
let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _sfxGain: GainNode | null = null;
let _musicGain: GainNode | null = null;

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch (_e) {
    // localStorage unavailable - fine, use defaults
  }
  return { ...defaultSettings };
}

function saveSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings));
  } catch (_e) {
    // ignore
  }
}

// Lazy init on first call. Returns null if Web Audio is unavailable.
function ensureCtx(): AudioContext | null {
  if (_ctx) return _ctx;
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    _ctx = new Ctor();
    _masterGain = _ctx.createGain();
    _sfxGain = _ctx.createGain();
    _musicGain = _ctx.createGain();
    _sfxGain.connect(_masterGain);
    _musicGain.connect(_masterGain);
    _masterGain.connect(_ctx.destination);
    applyVolumes();
  } catch (_e) {
    return null;
  }
  return _ctx;
}

function applyVolumes(): void {
  if (!_masterGain || !_sfxGain || !_musicGain) return;
  _masterGain.gain.value = _settings.masterEnabled ? _settings.masterVolume : 0;
  _sfxGain.gain.value = _settings.sfxVolume;
  _musicGain.gain.value = _settings.musicVolume;
}

// ---------- Public API ----------

export function getAudioSettings(): AudioSettings {
  return { ..._settings };
}

export function setAudioSettings(patch: Partial<AudioSettings>): void {
  const musicTouched = 'musicEnabled' in patch || 'masterEnabled' in patch;
  _settings = { ..._settings, ...patch };
  saveSettings();
  applyVolumes();
  if (musicTouched) applyMusicEnabled();
}

// Resume context after a user gesture (some browsers suspend it until then).
export function unlockAudio(): void {
  const ctx = ensureCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// ---------- SFX dispatch ----------

// File-based sfx mapping. Sound files live in public/audio/sfx/.
// Anything in this map gets played from file; anything NOT in this map falls
// back to the synth version below.
//
// To add a file-based sfx: drop the .ogg into public/audio/sfx/ and add a
// mapping line here. To revert one back to synth: remove its line here.
const SFX_FILES: Partial<Record<SfxId, string>> = {
  chop:    '/audio/sfx/woodchop.ogg',
  mine:    '/audio/sfx/miningdone.ogg',
  smith:   '/audio/sfx/smithingdone.ogg',
  levelup: '/audio/sfx/getperkpoint.ogg',
  coin:    '/audio/sfx/sellcoin.ogg',
  click:   '/audio/sfx/click.ogg',
};

// Cached decoded audio buffers — decoded once on first play of each sfx.
// Keeps subsequent plays cheap (no fetch, no decode).
const _sfxBuffers: Partial<Record<SfxId, AudioBuffer | 'loading' | 'failed'>> = {};

export function playSfx(id: SfxId): void {
  if (!_settings.masterEnabled) return;
  const ctx = ensureCtx();
  if (!ctx || !_sfxGain) return;

  // If we have a file mapping for this sfx, use it. Otherwise synth.
  const filePath = SFX_FILES[id];
  if (filePath) {
    playSfxFile(ctx, _sfxGain, id, filePath);
  } else {
    synthSfx(ctx, _sfxGain, id);
  }
}

// Plays a file-based sfx. On first call, fetches and decodes the file then
// caches the buffer. If the load fails, falls back to synth and stays on
// synth for all future plays of that id.
function playSfxFile(ctx: AudioContext, dest: GainNode, id: SfxId, url: string): void {
  const cached = _sfxBuffers[id];

  // Already loaded — play immediately
  if (cached && cached !== 'loading' && cached !== 'failed') {
    playBuffer(ctx, dest, cached);
    return;
  }
  // Previously failed — fall back to synth permanently
  if (cached === 'failed') {
    synthSfx(ctx, dest, id);
    return;
  }
  // Currently loading — play synth this time, the file will be ready next time
  if (cached === 'loading') {
    synthSfx(ctx, dest, id);
    return;
  }

  // First play — kick off load, also play synth so user hears SOMETHING now
  _sfxBuffers[id] = 'loading';
  synthSfx(ctx, dest, id);
  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`${r.status} on ${url}`);
      return r.arrayBuffer();
    })
    .then(buf => ctx.decodeAudioData(buf))
    .then(decoded => {
      _sfxBuffers[id] = decoded;
      console.log(`[sfx] ✓ loaded ${url}`);
    })
    .catch(err => {
      console.warn(`[sfx] failed to load ${url}, falling back to synth permanently:`, err.message);
      _sfxBuffers[id] = 'failed';
    });
}

// Plays a decoded AudioBuffer through the sfx gain node.
function playBuffer(ctx: AudioContext, dest: GainNode, buf: AudioBuffer): void {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  src.start();
}

// Synthesized placeholder sounds. Used as fallback for any sfx without a
// file mapping in SFX_FILES.
function synthSfx(ctx: AudioContext, dest: GainNode, id: SfxId): void {
  const now = ctx.currentTime;
  switch (id) {
    case 'click':       blip(ctx, dest, now, 'square',   620, 0.04, 0.05); break;
    case 'chop':        thock(ctx, dest, now);                              break;
    case 'craft':       chime(ctx, dest, now, [520, 780], 0.08);            break;
    case 'hit':         blip(ctx, dest, now, 'sawtooth', 180, 0.10, 0.08);  break;
    case 'defeat':      chime(ctx, dest, now, [330, 440, 660], 0.18);       break;
    case 'player_hit':  blip(ctx, dest, now, 'sawtooth', 95,  0.18, 0.12);  break;
    case 'levelup':     chime(ctx, dest, now, [523, 659, 784, 988], 0.30);  break;
    case 'quest_complete': chime(ctx, dest, now, [523, 659, 784, 1047], 0.40); break;
    case 'coin':        blip(ctx, dest, now, 'triangle', 880, 0.05, 0.05);  break;
    case 'denied':      blip(ctx, dest, now, 'square',   200, 0.10, 0.10);  break;
    case 'hire':        fanfare(ctx, dest, now);                            break;
    case 'mine':        tink(ctx, dest, now);                               break;
    case 'smith':       clang(ctx, dest, now);                              break;
  }
}

// Pickaxe on stone — short metallic ping with a quick decay
function tink(ctx: AudioContext, dest: GainNode, when: number): void {
  blip(ctx, dest, when, 'square', 1400, 0.06, 0.04);
  blip(ctx, dest, when + 0.005, 'triangle', 700, 0.04, 0.08);
}

// Hammer on anvil — heavier two-strike with ringing overtones
function clang(ctx: AudioContext, dest: GainNode, when: number): void {
  // Low thud
  blip(ctx, dest, when, 'square', 110, 0.18, 0.05);
  // Bright ringing
  blip(ctx, dest, when + 0.01, 'triangle', 880,  0.06, 0.25);
  blip(ctx, dest, when + 0.01, 'triangle', 1320, 0.04, 0.20);
}

// Grander 6-note fanfare with a held final chord for hire celebration
function fanfare(ctx: AudioContext, dest: GainNode, when: number): void {
  // Rising arpeggio then a chord
  const arp = [392, 523, 659, 784]; // G4 C5 E5 G5
  const step = 0.08;
  for (let i = 0; i < arp.length; i++) {
    blip(ctx, dest, when + i * step, 'triangle', arp[i], 0.12, step + 0.10);
  }
  // Held chord at the end (root, third, fifth)
  const chordStart = when + arp.length * step;
  const chord = [523, 659, 784, 1047]; // C-E-G-C
  for (const f of chord) {
    blip(ctx, dest, chordStart, 'triangle', f, 0.08, 0.55);
  }
}

// Short pitched blip helper
function blip(
  ctx: AudioContext, dest: GainNode, when: number,
  type: OscillatorType, freq: number, gain: number, duration: number,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, when + duration);
  osc.connect(g);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

// Wood-impact "thock" - noise burst with low-pass
function thock(ctx: AudioContext, dest: GainNode, when: number): void {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 800;
  const g = ctx.createGain();
  g.gain.value = 0.45;
  src.connect(lp);
  lp.connect(g);
  g.connect(dest);
  src.start(when);
}

// Quick arpeggio for craft/level/quest celebration sounds
function chime(ctx: AudioContext, dest: GainNode, when: number, freqs: number[], totalDuration: number): void {
  const step = totalDuration / freqs.length;
  for (let i = 0; i < freqs.length; i++) {
    blip(ctx, dest, when + i * step, 'triangle', freqs[i], 0.10, step + 0.06);
  }
}

// ============================================================================
// MUSIC SYSTEM
// ============================================================================
//
// Plays looping music tracks per-floor with crossfade on track change.
//
// Two backends supported:
//   - 'file': Loads an audio file (.mp3/.ogg/.wav) and loops it. The real
//     plan once you source music. Drop a URL into the track config.
//   - 'synth': An on-the-fly Web Audio synthesized drone. Used as a
//     placeholder until real music is available. INTENTIONALLY MINIMAL —
//     it's room tone, not a melody. Easy to swap out when you have files.
//
// To replace a synth placeholder with a real track:
//   TRACKS.splinterwood = { backend: 'file', url: '/audio/splinterwood.mp3', loop: true, gain: 1.0 };

type MusicBackend = 'file' | 'synth';

interface TrackConfig {
  backend: MusicBackend;
  url?: string;             // for 'file'
  loop?: boolean;           // default true
  gain?: number;            // per-track gain offset (default 1.0)
  synthPreset?: SynthPreset;
}

type SynthPreset = 'splinterwood' | 'greystone' | 'silent';

// ----------------------------------------------------------------------------
// MUSIC TRACK CONFIG — edit this to add per-floor tracks
// ----------------------------------------------------------------------------
//
// HOW TO ADD A NEW TRACK FOR A FLOOR:
//   1. Drop the audio file into `public/audio/` (any common format works:
//      .mp3, .ogg, .wav — mp3 is smallest, fine for game use).
//   2. Add or edit an entry below mapping the floor id to its filename.
//   3. Save. The dev server hot-reloads; on next floor visit the new track
//      will crossfade in.
//
// Floor IDs match those in src/data/floors.ts:
//   splinterwood, greystone_reach, floor_3, floor_4, floor_5
//
// CREDITS for tracks currently in use:
//   "Onward" by Vindsvept — CC BY 4.0
//   https://vindsvept.se/licensing/ · https://www.youtube.com/Vindsvept
//
// FALLBACK: if a floor isn't listed below, or its file is missing/404s,
// MUSIC_FALLBACK_FILE plays instead. So you can have partial coverage without
// silence on uncovered floors.

const MUSIC_FALLBACK_FILE = '/audio/menu.mp3';

// One entry per floor with a real track. Leave commented or absent for floors
// that should use the fallback. The shape is intentionally minimal — gain
// (per-track volume offset) defaults to 1.0 if not given.
const FLOOR_TRACK_FILES: Partial<Record<string, { file: string; gain?: number }>> = {
  // splinterwood:    { file: '/audio/splinterwood.mp3' },
  // greystone_reach: { file: '/audio/greystone.mp3'    },
  // floor_3:         { file: '/audio/floor_3.mp3'      },
  // ...
};

// Build the TRACKS registry from the floor file config + fallback.
// You should rarely need to touch this — edit FLOOR_TRACK_FILES above instead.
function buildTracks(): Record<string, TrackConfig> {
  const out: Record<string, TrackConfig> = {};
  const allFloorIds = ['splinterwood', 'greystone_reach', 'floor_3', 'floor_4', 'floor_5'];
  for (const id of allFloorIds) {
    const cfg = FLOOR_TRACK_FILES[id];
    out[id] = cfg
      ? { backend: 'file', url: cfg.file, loop: true, gain: cfg.gain ?? 1.0 }
      : { backend: 'file', url: MUSIC_FALLBACK_FILE, loop: true, gain: 1.0 };
  }
  return out;
}

export const TRACKS: Record<string, TrackConfig> = buildTracks();

// Currently playing track state
interface ActiveTrack {
  id: string;
  config: TrackConfig;
  // for 'file' backend
  audioEl?: HTMLAudioElement;
  // for 'synth' backend
  synthNodes?: { oscs: OscillatorNode[]; gains: GainNode[]; lfo?: OscillatorNode; lfoGain?: GainNode };
  // shared gain node — what we ramp for crossfades
  trackGain?: GainNode;
}

let _currentTrack: ActiveTrack | null = null;
let _pendingTrackId: string | null = null;

const CROSSFADE_SEC = 1.8;

export function setMusicTrack(trackId: string | null): void {
  // Only short-circuit if the requested track is ALREADY playing (audio element
  // present, not null). This way, if autoplay was blocked on first attempt,
  // a later user-gesture click will retry from scratch.
  if (_currentTrack && _currentTrack.id === trackId) {
    return;
  }
  console.log(`[music] setMusicTrack(${trackId})`);
  _pendingTrackId = trackId;

  // Tear down current if it exists
  if (_currentTrack) {
    fadeOutAndStop(_currentTrack);
    _currentTrack = null;
  }

  if (!trackId) return;
  if (!_settings.masterEnabled || !_settings.musicEnabled) {
    console.log(`[music] Skipping start: masterEnabled=${_settings.masterEnabled} musicEnabled=${_settings.musicEnabled}`);
    return;
  }

  const cfg = TRACKS[trackId];
  if (!cfg) {
    console.warn(`[music] No track configured for "${trackId}"`);
    return;
  }

  const ctx = ensureCtx();
  if (!ctx || !_musicGain) {
    console.warn(`[music] Audio context not ready: ctx=${!!ctx} musicGain=${!!_musicGain}`);
    return;
  }

  console.log(`[music] Starting ${cfg.backend} track for "${trackId}" from ${cfg.url ?? '(synth)'}`);
  if (cfg.backend === 'file' && cfg.url) {
    startFileTrack(ctx, _musicGain, trackId, cfg);
  } else if (cfg.backend === 'synth') {
    startSynthTrack(ctx, _musicGain, trackId, cfg);
  }
}

export function stopMusic(): void {
  if (_currentTrack) {
    fadeOutAndStop(_currentTrack);
    _currentTrack = null;
  }
  _pendingTrackId = null;
}

// Called whenever music settings change so we can immediately
// (un)mute or restart.
function applyMusicEnabled(): void {
  if (!_settings.masterEnabled || !_settings.musicEnabled) {
    stopMusic();
  } else if (_pendingTrackId && !_currentTrack) {
    // Re-start whatever was pending
    const id = _pendingTrackId;
    _pendingTrackId = null;
    setMusicTrack(id);
  }
}

function fadeOutAndStop(track: ActiveTrack): void {
  if (!_ctx || !track.trackGain) {
    // Hard stop if we have no context
    if (track.audioEl) { try { track.audioEl.pause(); } catch { /* ignore */ } }
    if (track.synthNodes) {
      for (const o of track.synthNodes.oscs) { try { o.stop(); } catch { /* ignore */ } }
      try { track.synthNodes.lfo?.stop(); } catch { /* ignore */ }
    }
    return;
  }
  const ctx = _ctx;
  const now = ctx.currentTime;
  try {
    track.trackGain.gain.cancelScheduledValues(now);
    track.trackGain.gain.setValueAtTime(track.trackGain.gain.value, now);
    track.trackGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SEC);
  } catch { /* ignore */ }

  window.setTimeout(() => {
    if (track.audioEl) { try { track.audioEl.pause(); } catch { /* ignore */ } }
    if (track.synthNodes) {
      for (const o of track.synthNodes.oscs) { try { o.stop(); } catch { /* ignore */ } }
      try { track.synthNodes.lfo?.stop(); } catch { /* ignore */ }
    }
  }, (CROSSFADE_SEC + 0.1) * 1000);
}

function startFileTrack(ctx: AudioContext, dest: GainNode, id: string, cfg: TrackConfig): void {
  if (!cfg.url) return;
  const audio = new Audio(cfg.url);
  audio.loop = cfg.loop !== false;
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';

  // Route audio element through Web Audio so gain controls work uniformly
  const src = ctx.createMediaElementSource(audio);
  const trackGain = ctx.createGain();
  trackGain.gain.value = 0;
  src.connect(trackGain);
  trackGain.connect(dest);

  const targetGain = cfg.gain ?? 1.0;

  // If the configured file is missing (404) or otherwise fails to load,
  // fall back to MUSIC_FALLBACK_FILE so the player isn't left in silence.
  audio.addEventListener('error', () => {
    console.warn(`[music] Failed to load ${cfg.url} (error event). Check that the file exists at public${cfg.url}`);
    if (cfg.url === MUSIC_FALLBACK_FILE) {
      console.error(`[music] Even the fallback ${MUSIC_FALLBACK_FILE} failed. Music will not play.`);
      return;
    }
    if (_currentTrack && _currentTrack.id === id) {
      fadeOutAndStop(_currentTrack);
      _currentTrack = null;
    }
    const fallbackCfg: TrackConfig = { backend: 'file', url: MUSIC_FALLBACK_FILE, loop: true, gain: 1.0 };
    startFileTrack(ctx, dest, id, fallbackCfg);
  });

  audio.addEventListener('canplaythrough', () => {
    console.log(`[music] ✓ Loaded ${cfg.url}, playing`);
  });

  audio.play().catch((err) => {
    console.warn(`[music] play() rejected:`, err.message, '— browser autoplay policy. Will retry on next user gesture.');
  });

  const now = ctx.currentTime;
  trackGain.gain.linearRampToValueAtTime(targetGain, now + CROSSFADE_SEC);

  _currentTrack = { id, config: cfg, audioEl: audio, trackGain };
}

// ---- Synth placeholder presets ----
//
// Each is a deliberately sparse drone. Not a melody — closer to "the room
// has a sound." Designed to be ignorable. Replace with real tracks ASAP.

function startSynthTrack(ctx: AudioContext, dest: GainNode, id: string, cfg: TrackConfig): void {
  const trackGain = ctx.createGain();
  trackGain.gain.value = 0;
  trackGain.connect(dest);

  const targetGain = cfg.gain ?? 1.0;
  const now = ctx.currentTime;

  const preset = cfg.synthPreset ?? 'silent';
  const nodes = preset === 'splinterwood'
    ? makeSplinterwoodDrone(ctx, trackGain)
    : preset === 'greystone'
      ? makeGreystoneDrone(ctx, trackGain)
      : makeSilent(ctx, trackGain);

  trackGain.gain.linearRampToValueAtTime(targetGain, now + CROSSFADE_SEC);

  _currentTrack = { id, config: cfg, synthNodes: nodes, trackGain };
}

// Splinterwood: warm major-ish drone in a low-mid register with very slow
// LFO modulation on filter cutoff. Open and pastoral.
function makeSplinterwoodDrone(ctx: AudioContext, dest: GainNode) {
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  // Drone pitches: C2, G2, E3 (rough C major triad)
  const pitches = [65.4, 98.0, 164.8];
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  lp.Q.value = 1.2;
  lp.connect(dest);

  for (const f of pitches) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.10;
    osc.connect(g);
    g.connect(lp);
    osc.start();
    oscs.push(osc);
    gains.push(g);
  }

  // Very slow LFO on filter cutoff for gentle breathing
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.05; // 20 seconds per cycle
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(lp.frequency);
  lfo.start();

  return { oscs, gains, lfo, lfoGain };
}

// Greystone: lower, colder, minor. Stone hall feel.
function makeGreystoneDrone(ctx: AudioContext, dest: GainNode) {
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  // A1, E2, C3 — A minor low
  const pitches = [55.0, 82.4, 130.8];
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 450;
  lp.Q.value = 1.4;
  lp.connect(dest);

  for (const f of pitches) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';  // slightly more harmonic content for that cold metal feel
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.07;
    osc.connect(g);
    g.connect(lp);
    osc.start();
    oscs.push(osc);
    gains.push(g);
  }

  // Slow LFO
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.035;  // even slower
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 150;
  lfo.connect(lfoGain);
  lfoGain.connect(lp.frequency);
  lfo.start();

  return { oscs, gains, lfo, lfoGain };
}

function makeSilent(_ctx: AudioContext, _dest: GainNode) {
  return { oscs: [], gains: [] };
}
