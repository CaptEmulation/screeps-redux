import './prototypes';
import './Memory';
import './rooms'
import './creeps';
import './spawns';
import store from './store';

import {
  LOOP,
} from './events';

export function loop() {
  store.dispatch({ type: LOOP });
  Creep.getOutOfTheWay();
}
