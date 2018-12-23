import './prototypes';
import './Memory';
import './Creeps';
import store from './store';

import {
  LOOP,
} from './events';

export function loop() {
  store.dispatch({ type: LOOP });
  Creep.getOutOfTheWay();
}
