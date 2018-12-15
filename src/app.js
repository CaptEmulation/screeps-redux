import './prototypes';
import { init as initController } from './Controller';
//import { init as initEconomy } from './Economy';
import { init as initConstruction } from './Builder';
import { init as initMap } from './Map';
import { init as initMemory } from './Memory';
import './Defense';
import './Creeps';
import './Scout';
import './Fixer';
import './Harvester';
import './Miner';
import { init as initSpawn } from './Spawn'

import store from './store';

import {
  LOOP,
} from './events';

initController(store);
//initEconomy(store);
initConstruction(store);
initMap(store);
initMemory(store);
initSpawn(store);

export function loop() {
  store.dispatch({ type: LOOP });
}