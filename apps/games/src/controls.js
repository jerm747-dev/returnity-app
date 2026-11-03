// The arcade's controls, with React hooks on top of controls-core.js.
import { useSyncExternalStore } from 'react';
import { subscribe, controlsSnapshot, loadDisplay } from './controls-core.js';

export * from './controls-core.js';
export const useControls = (p) => useSyncExternalStore(subscribe, () => controlsSnapshot(p));
export const useDisplay = () => useSyncExternalStore(subscribe, loadDisplay);
