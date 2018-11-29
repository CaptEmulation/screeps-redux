import mapValues from 'lodash.mapvalues';
import difference from 'lodash.difference';
import differenceWith from 'lodash.differencewith';
import flow from 'lodash.flow';
import { createSelector } from 'reselect';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import createReducer from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';

import {
  START,
  RUN,
} from '../events';

const QUEUE = 'SPAWN_QUEUE';
const POP = 'SPAWN_POP';
const SPAWNED = 'SPAWNED';
const NEEDS = 'SPAWN_NEEDS';
const NEEDS_UPDATE = 'SPAWN_NEEDS_UPDATE';

export const actionTypes = {
  QUEUE,
  POP,
  SPAWNED,
  NEEDS,
  NEEDS_UPDATE,
};

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

function need({
  needs = [],
  controller,
}) {
  return {
    type: NEEDS,
    payload: {
      needs,
      controller,
    },
  };
}

function updateNeeds(needs) {
  return {
    type: NEEDS_UPDATE,
    payload: needs,
  };
}


export const actionCreators = {
  queue,
  pop,
  need,
  updateNeeds,
};

const sortHunger = (a, b) => (a.priority + a.hunger) - (b.priority + b.hunger);
export const nextNeed = needs => needs
  .map(h => {
    if(!Game.creeps[h.name]) {
      return {...h, hunger: h.hunger - 1 };
    }
    return h;
  })
  .sort(sortHunger);

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
const selectSpawned = createSelector(
  root,
  spawn => spawn.spawned,
);
const selectNextNeeds = createSelector(
  selectNeeds,
  nextNeed,
);

export const selectors = {
  pending: selectPending,
  pendingNames: selectPendingNames,
  needsSpawn: selectNeedsSpawn,
  needs: selectNeeds,
  nextNeeds: selectNextNeeds,
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

function* start() {
  yield takeEvery(START, function* onSpawnStart() {
    // Clear and rebuild on every tick (for now)
    // TODO use way less memory if we don't need it
    yield put(updateNeeds([]));
  });
}

function* run() {
  yield takeEvery(RUN, function* onRun() {
    const needs = yield select(selectNeeds);
    const need = needs.find(need => {
      if(Game.creeps[need.name]) {
        return false;
      }
      const {
        body,
        name,
        memory,
      } = need;

      if (Game.spawns['Spawn1'].spawnCreep(body, name, {
        memory,
        dryRun: true,
      })) {
        return false;
      }
      return !Game.spawns['Spawn1'].spawnCreep(body, name, {
        memory,
      });
    });
    if (need) {
      need.hunger = 1;
      yield put(updateNeeds(nextNeed(needs)));
    }
  });
}

createSaga(
  start,
  run,
);

const initialState = {
  pending: [],
  needs: [],
  spawned: null,
};

export const reducer = createReducer('Spawn', initialState, {
  [QUEUE](state, { payload: [bodyParts, name, memory] }) {
    if(state.pending.map(c => c[1]).indexOf(name) === -1) {
      return {
        ...state,
        pending: [...state.pending, [bodyParts, name, memory]],
      };
    }
    return state;
  },
  [SPAWNED](state, { payload: spawned }) {
    return {
      ...state,
      spawned,
    };
  },
  [POP](state) {
    return {
      ...state,
      pending: state.pending.slice(1),
    };
  },
  [NEEDS](state, { payload: { needs: input, controller } }) {
    const definition = Array.isArray(input) ? input : [input];
    const incomingNames = definition.map(n => n.name);
    const existingNeeds = state.needs
      .filter(n => n.controller !== controller);
    const needs = [...definition
      .map(n => ({
        priority: 0,
        ...n,
        hunger: 0,
      })), ...existingNeeds]
      .sort(sortHunger);
    return {
      ...state,
      needs,
    };
  },
  [NEEDS_UPDATE](state, { payload: needs }) {
    return {
      ...state,
      needs,
    };
  },
});

createModule('Spawn', {
  actionCreators,
  selectors,
});
