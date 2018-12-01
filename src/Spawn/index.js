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
  UPDATE,
  RUN,
  COMMIT,
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

function need(opts) {
  const { needs } = opts;
  const meta = _.omit(opts, 'needs');
  return {
    type: NEEDS,
    payload: {
      needs,
      meta,
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

const decrementHunger = h => {
  if(!Game.creeps[h.name]) {
    return {...h, hunger: h.hunger - 1 };
  }
  return h;
};
const sortHunger = (a, b) => (a.priority - a.hunger) - (b.priority - b.hunger);
export const nextNeed = needs => needs
  .map(decrementHunger)
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
const selectSpawnNeeds = createSelector(
  selectNeeds,
  needs => needs
    .filter(({ name }) => !Game.creeps[name])
    .sort(sortHunger),
)
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
  yield takeEvery(UPDATE, function* onSpawnStart() {
    // Clear and rebuild on every tick (for now)
    // TODO use way less memory if we don't need it
    // yield put(updateNeeds([]));

  });
}

const extensionsMax = [0, 50, 50, 50, 50, 50, 100, 200];
function extensionEnergyStatus(room) {
  const extensions = spawn.room.find(FIND_MY_STRUCTURES, {
    filter(target) {
      return target.structureType === STRUCTURE_EXTENSION;
    },
  });
  const max = extensionsMax[room.controller.level] * extensions.length;
  const available = _.sum(extensions.map(e => e.energy));
  return {
    max,
    available,
  };
}

function calcCreepCost(bodyParts) {
  return _.sum(bodyParts.map(part => BODYPART_COST[part]));
}

function* run() {
  yield takeEvery(RUN, function* onRun() {
    const spawnNeeds = yield select(selectSpawnNeeds);
    const spawnersInRoom = {};
    let requestSpawn = [];
    let waitingForEnergy;

    for (let need of spawnNeeds) {
      const { body, name, memory, room: roomName } = need;
      const room = Game.rooms[roomName];
      if (!room) {
        continue;
      }
      let roomInfo;
      if (spawnersInRoom[roomName]) {
        roomInfo = spawnersInRoom[roomName];
      } else {
        roomInfo = spawnersInRoom[roomName] = {
          extensions: extensionEnergyStatus(room),
          spawners: Game.rooms[roomName].find(FIND_MY_STRUCTURES, {
            filter: target => target.structureType === STRUCTURE_SPAWN
          }),
        };
      }
      const cost = calcCreepCost(body);
      if (roomInfo.spawners.length) {
        const spawner = roomInfo.spawners.shift();
        if (cost <= (roomInfo.extensions.available + roomInfo.spawners.energy)) {
          requestSpawn.push([spawner, body, name, { memory }]);
        }
        // Earmark energy for use on this creep if cost is possible
        if (cost <= (roomInfo.extensions.max + roomInfo.spawners.energy)) {
          const extensionEnergy = cost - spawner.energy;
          roomInfo.extensions.availabe -= extensionEnergy;
        }
      } else if (Game.time % 5 === 0) {
        // This creep wants to spawn but is being held back for later
        need.hunger++;
      }
    }
    for (let request of requestSpawn) {
      const [spawner, body, name, opts] = request;
      console.log('spawning', request);
      const err = spawner.spawnCreep(body, name, opts);
      if (err) {
        console.log('Error spawning', name, err);
      }
    }
  });
}

function* commit() {
  return takeEvery(COMMIT, function* () {
    const needs = yield select(selectNeeds);
    // Only save name and hunger
    yield put(updateNeeds(needs.map(({ hunger, name }) => ({
      name,
      hunger,
    }))));
  });
}

createSaga(
  start,
  run,
  commit,
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
  [NEEDS](state, { payload: { needs: input, meta } }) {
    const definition = Array.isArray(input) ? input : [input];
    const existingNeeds = state.needs
      .filter(n => n.controller !== (meta.controller || definition[0].controller));

    const needs = [...definition
      .map(n => ({
        priority: 0,
        hunger: 0,
        ...definition.find(def => def.name === n.name),
        ...meta,
        ...n,
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
