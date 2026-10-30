// Embedded so both the CDN entry and the offline build retain attribution-backed art.
import idle from './art/idle.js';
import happy from './art/happy.js';
import eat from './art/eat.js';
export const characterSources = { idle, happy, eat };
export const characterImages = {};
export async function loadCharacterArt() {
  await Promise.all(Object.entries(characterSources).map(async ([name, src]) => {
    const image = new Image(); image.src = src; await image.decode(); characterImages[name] = image;
  }));
}
