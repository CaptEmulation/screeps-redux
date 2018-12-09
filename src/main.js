import './prototypes';
import { init as initController } from './Controller';
import { init as initEconomy } from './Economy';
import { init as initConstruction } from './Construction';
import { init as initMap } from './Map';
import { init as initMemory } from './Memory';
import { init as initBrood } from './Creeps/brood';
import './Defense';
import './Creeps';
import './Scout';
import './Fixer';
import './Hauler';
import { init as initSpawn } from './Spawn'

import store from './store';

import {
  START,
  LOOP,
} from './events';

initController(store);
initEconomy(store);
initConstruction(store);
initMap(store);
initMemory(store);
initSpawn(store);
initBrood(store);

export function loop() {
  store.dispatch({ type: LOOP });
}

store.dispatch({ type: START });
