import './prototypes';
import './Memory';
import './rooms'
import './creeps';
import './spawns';
import './towers';
import store from './store';

import {
  LOOP,
} from './events';

export function loop() {
  store.dispatch({ type: LOOP });
  Creep.getOutOfTheWay();
  Object.keys(Memory.creeps).forEach(name => {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
    }
  });
}
