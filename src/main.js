import { init as initController } from './Controller';
import { init as initEconomy } from './Economy';
import { init as initConstruction } from './Construction';
import { init as initSpawn } from './Spawn';
import { init as initCreeps } from './Creeps';
import { init as initMemory } from './Memory';

import store from './store';

import {
  START,
  RUN,
  FINAL,
} from './tickEvents';

initController(store);
initSpawn(store);
initEconomy(store);
initConstruction(store);
initCreeps(store);
initMemory(store);

export function loop() {
  store.dispatch({ type: START });
  store.dispatch({ type: RUN });
  store.dispatch({ type: FINAL });
}
