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
import { init as initHarvester } from'./Harvester';
import { init as initHauler } from './Hauler';
import { init as initDrainer } from './Drainer';
import { init as initClaimer } from './Claimer';
import { init as initUnbuilder } from './Unbuilder';
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
initHauler(store);
initDrainer(store);
initClaimer(store);
initUnbuilder(store);
initSpawn(store);
initHarvester(store);

export function loop() {
  store.dispatch({ type: LOOP });
}
