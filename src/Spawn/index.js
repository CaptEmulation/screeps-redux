import mapValues from 'lodash.mapvalues';
import difference from 'lodash.difference';
import { createSelector } from 'reselect';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import createReducer from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';

import {
  RUN,
} from '../tickEvents';

const QUEUE = 'SPAWN_QUEUE';
const POP = 'SPAWN_POP';
const NEEDS = 'SPAWN_NEEDS';
const NEEDS_UPDATE = 'SPAWN_NEEDS_UPDATE';

function queue(bodyParts, name, memory) {
  return {
    type: QUEUE,
    payload: [bodyParts, name, memory],
  };
}

function pop() {
  return {
    type: POP,
  }
}

function addNeed(definition) {
  return {
    type: NEEDS,
    payload: definition,
  };
}

function updateNeed(definition) {
  return {
    type: NEEDS_UPDATE,
    payload: definition,
  };
}

export const actionCreators = {
  queue,
  pop,
};

const root = state => state.Spawn;
const selectCreeps = state => Memory.creeps;
const selectPending = createSelector(
  root,
  spawn => spawn.pending,
);
const selectPendingNames = createSelector(
  selectPending,
  pending => pending.map(p => p[1]),
);

const selectNeedsSpawn = createSelector(
  selectCreeps,
  selectPendingNames,
  selectPending,
  (creeps, names, pending) => difference(names, Object.keys(creeps)).map(name => pending.find(p => p[1] === name)),
);

const selectNeeds = createSelector(
  root,
  spawn => spawn.needs,
);

export const selectors = {
  pending: selectPending,
  pendingNames: selectPendingNames,
  needsSpawn: selectNeedsSpawn,
}

export function init(store) {
  global.Spawner = {
    ...mapValues(actionCreators, action => (...args) => store.dispatch({
      type: 'EXE',
      payload: action(...args),
    })),
    selectors: mapValues(selectors, selector => () => selector(store.getState())),
  };
}

function* run() {
  yield takeEvery(RUN, function* onRun() {
    const needsSpawn = yield select(selectNeedsSpawn);
    if (needsSpawn.length) {
      const creep = needsSpawn[0];
      const err = Game.spawns['Spawn1'].spawnCreep(...creep);
      if (!err || err === ERR_NAME_EXISTS) {
        yield put(pop());
      }
    }

  });
}

createSaga(
  run,
);

const initialState = {
  pending: [],
};

createReducer('Spawn', initialState, {
  [QUEUE](state, { payload: [bodyParts, name, memory] }) {
    if(state.pending.map(c => c[1]).indexOf(name) === -1) {
      return {
        ...state,
        pending: [...state.pending, [bodyParts, name, memory]],
      };
    }
    return state;
  },
  [POP](state) {
    return {
      ...state,
      pending: state.pending.slice(1),
    };
  },
  [UPDATE_NEEDS](state, { payload: definition }) {
    const existingNeed = state.needs.find(n => n.id === definition.id);
    let newNeeds;
    if (existingNeed) {
      const index = state.needs.indexOf(existingNeed);
      newNeeds = [...state.needs.slice(0, index), definition, ...state.needs.slice(index + 1)];
    } else {
      newNeeds = [...state.needs, definition];
    }
    return {
      ...state,
      needs: newNeeds,
    };
});

createModule('Spawn', {
  actionCreators,
  selectors,
});
