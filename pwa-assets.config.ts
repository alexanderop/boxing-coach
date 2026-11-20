import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the favicon and PWA icons from the one source image at dev and
// build time (wired through the `pwaAssets` option in vite.config.ts). No
// derived icons need to be committed to the repo.
//
// The logo is a red glove on the app's near-black, drawn full-bleed with its
// own margin — so every variant is made without extra padding and on the same
// background. The preset's defaults would shrink it onto a white tile, which
// puts a white ring around a dark icon on every home screen.
const LOGO_BACKGROUND = '#0a0a0a'
const fullBleed = {
  padding: 0,
  resizeOptions: { background: LOGO_BACKGROUND, fit: 'cover' },
} as const

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, ...fullBleed },
    maskable: { ...minimal2023Preset.maskable, ...fullBleed },
    apple: { ...minimal2023Preset.apple, ...fullBleed },
  },
  images: ['public/logo.png'],
})
