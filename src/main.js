/**
 * Entry point for MusicWorld26 — Mood Music Player.
 */

import { App } from './ui/app.js';

const app = new App();

app.init().catch((err) => {
  console.error('Failed to initialize app:', err);
});
