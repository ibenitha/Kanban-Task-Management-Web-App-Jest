// TESTING LAB: runs once before every test file.
// Loads zone.js and initialises Angular's TestBed for a browser-like (jsdom) environment,
// matching the app, which uses zone.js change detection (see src/main.ts).
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// jsdom (Jest's fake browser) doesn't provide structuredClone, which real browsers do.
// The in-memory API uses it to copy the seed data, so add a simple JSON-based version.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
}
