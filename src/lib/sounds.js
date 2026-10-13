/**
 * Sons compartilhados por todas as fases e pelo menu.
 * Substitua os require pelos seus arquivos reais em assets/sounds/.
 *
 * Uso nas fases (já existente):
 *   import { sfx, music } from '../lib/sounds'
 *   sfx.tap(); sfx.deploy(); sfx.fail(); sfx.win();
 *   music.start(); music.stop(); music.setMuted(true);
 */

import { Audio } from 'expo-av'
import { Platform } from 'react-native'

let muted = false
let bgSound = null

async function play(module, { volume = 1 } = {}) {
  if (muted || !module) return
  try {
    const { sound } = await Audio.Sound.createAsync(module, { shouldPlay: true, volume })
    sound.setOnPlaybackStatusUpdate((st) => {
      if (st.didJustFinish) sound.unloadAsync().catch(() => {})
    })
  } catch (_) {
    // silencioso se o arquivo ainda não existir
  }
}

// Coloque os arquivos em assets/sounds/ e descomente os requires
const FILES = {
  // tap: require('../../assets/sounds/tap.mp3'),
  // deploy: require('../../assets/sounds/deploy.mp3'),
  // fail: require('../../assets/sounds/fail.mp3'),
  // win: require('../../assets/sounds/win.mp3'),
  // music: require('../../assets/sounds/loja-loop.mp3'),
}

/** Usado pelo Root / Profile para ligar/desligar todos os sons. */
export function setSoundEnabled(enabled) {
  muted = !enabled
  if (muted && bgSound) bgSound.setIsMutedAsync(true).catch(() => {})
  else if (!muted && bgSound) bgSound.setIsMutedAsync(false).catch(() => {})
}

export const sfx = {
  tap: () => play(FILES.tap, { volume: 0.5 }),
  deploy: () => play(FILES.deploy, { volume: 0.7 }),
  fail: () => play(FILES.fail, { volume: 0.55 }),
  win: () => play(FILES.win, { volume: 0.8 }),
}

export const music = {
  isMuted: () => muted,
  setMuted(v) {
    muted = !!v
    if (muted && bgSound) bgSound.setIsMutedAsync(true).catch(() => {})
    else if (!muted && bgSound) bgSound.setIsMutedAsync(false).catch(() => {})
  },
  async start() {
    if (!FILES.music) return
    try {
      if (bgSound) {
        await bgSound.playAsync()
        return
      }
      const { sound } = await Audio.Sound.createAsync(FILES.music, {
        shouldPlay: true,
        isLooping: true,
        volume: 0.25,
        isMuted: muted,
      })
      bgSound = sound
    } catch (_) {}
  },
  async stop() {
    try {
      if (bgSound) {
        await bgSound.stopAsync()
        await bgSound.unloadAsync()
        bgSound = null
      }
    } catch (_) {}
  },
}

/** Preferências de TTS humanizado (Fase 4). */
export const VOICE = {
  // expo-speech — ajuste fino por personagem
  catia: { language: 'pt-BR', pitch: 1.05, rate: 0.9 },
  cliente: { language: 'pt-BR', pitch: 1.0, rate: 0.95 },
  tonho: { language: 'pt-BR', pitch: 0.92, rate: 0.93 },
  // Se gravar MP3 humanos:
  // clips: { catiaIntro: require('../../assets/voice/catia-intro.mp3'), ... }
}
