import get from 'lodash.get';
import mapValues from 'lodash.mapvalues';
import differenceWith from 'lodash.differencewith';
import difference from 'lodash.difference';
import cond from 'lodash.cond';
import intersection from 'lodash.intersection';
import { call, put, select, takeEvery } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import { actionCreators as spawnActions } from '../Spawn';
import { happy } from '../utils/id';
import createReducer from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';
import {
  RUN,
  FINAL,
} from '../tickEvents';

const ENABLE = 'MAP_ENABLE';
const DISABLE = 'MAP_DISABLE';
const SPAWN = 'MAP_SPAWN';
// const REMEMBER = 'MAP_REMEMBER';
const CLAIM_SOURCES = 'MAP_CLAIM_SOURCES';
const HARVEST_SOURCE = 'HARVEST_SOURCE';
const ASSIGN_NEW_WORK = 'ASSIGN_NEW_WORK';
const CLEAN_PROBES = 'MAP_CLEAN_PROBES';
const CLEAN_SOURCES = 'ECON_CLEAN_SOURCES';

function enable() {
  return {
    type: ENABLE,
  };
}

function disable() {
  return {
    type: DISABLE,
  };
}

function spawn(name) {
  return {
    type: SPAWN,
    payload: name,
  };
}

function search(room) {
  const sources = room.find(FIND_SOURCES);
  return {
    type: CLAIM_SOURCES,
    payload: sources
  }
}

export const actionCreators = {
  enable,
  spawn,
  search,
};

const root = state => state.Map;
const selectIsEnabled = createSelector(
  root,
  map => !!map.enabled,
);
const selectNeedsScout = createSelector(

)

export const selectors = {
  isEnabled: selectIsEnabled,
};

const SCOUT_COUNT = 3;
const scoutBody = [MOVE, MOVE, MOVE];
const scoutOpts = { memory: { role: 'scout' } };

export function init(store) {
  global.Map = {
    ...mapValues(actionCreators, action => (...args) => store.dispatch({
      type: 'EXE',
      payload: action(...args),
    })),
    selectors: mapValues(selectors, selector => () => selector(store.getState())),
  };
}

function* run() {
  yield takeEvery(RUN, function* onRun() {

    const creeps = yield select(selectCreeps);
    if (yield select(selectNeedsProbe)) {
      yield put(actionCreators.spawn(happy()));
    }

    const infants = yield select(selectInfants);
    if (infants.length) {
      yield put(actionCreators.assignNewWork());
    }

    const needsSpawn = yield select(selectNeedsSpawn);
    if (needsSpawn.length) {
      yield put(spawnActions.queue(probeBody, needsSpawn[0], probeMemory()));
    }

    const harvestProbes = yield select(selectHarvestProbes);
    harvestProbes.forEach(creep => {
      if (!creep) { console.log(JSON.stringify(creeps, null, 2)); }
      const source = Game.getObjectById(creep.memory.mine);
      if (creep.carry.energy < creep.carryCapacity) {
        const err = creep.harvest(source);
        if (err === ERR_NOT_IN_RANGE) {
          creep.moveTo(source, {
            reusePath: 15,
            visualizePathStyle: { stroke: '#ffaa00' },
          });
        }
      } else {
        const destination = creep.room.find(
          FIND_STRUCTURES,
          {
            filter: structure => (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN)
              && structure.energy < structure.energyCapacity,
          },
        );
        if(destination.length > 0) {
          if(creep.transfer(destination[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(destination[0], {
                reusePath: 15,
                visualizePathStyle: { stroke: '#ffffff' },
              });
          }
        }
      }
    })
  });
}

function *final() {
  yield takeEvery(FINAL, function* onFinal() {
    const deadProbes = yield select(selectDeadProbs);
    yield put(actionCreators.cleanProbes(deadProbes));
  });
}

createSaga(
  watchEnabled,
  watchNewWork,
  run,
  final,
);

const initialState = {
  enabled: true,
  home: {},
};

createReducer('Map', initialState, {
  [ENABLE](state) {
    return {
      ...state,
      enabled: true,
    };
  },
  [DISABLE](state) {
    return {
      ...state,
      enabled: false,
    };
  },
  [SPAWN](state, { payload: probe }) {
    return {
      ...state,
      probes: [...state.probes, probe],
    };
  },
  [CLAIM_SOURCES](state, { payload: sources }) {
    return {
      ...state,
      sources: [...differenceWith(state.sources, sources, (a, b) => a.id === b.id), ...sources],
    };
  },
  [CLEAN_PROBES](state, { payload: deadProbes }) {
    return {
      ...state,
      probes: [...difference(state.probes, deadProbes)],
    };
  },
  [CLEAN_SOURCES](state, { payload: deadProbes }) {
    return {
      ...state,
      sources: [],
    };
  },
});

createModule('Map', {
  selectors,
  actionCreators,
});
