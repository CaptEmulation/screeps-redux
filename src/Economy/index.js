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
  moveTo,
  tasks as creepTasks,
  acquireTask,
} from '../utils/creeps';
import {
  RUN,
  FINAL,
} from '../tickEvents';

const PROBE_COUNT = 4;
const ENABLE = 'ECONOMY_ENABLE';
const SPAWN = 'ECONOMY_SPAWN';
const REMEMBER = 'ECONOMY_REMEMBER';
const CLAIM_SOURCES = 'ECONOMY_CLAIM_SOURCES';
const HARVEST_SOURCE = 'HARVEST_SOURCE';
const ASSIGN_NEW_WORK = 'ASSIGN_NEW_WORK';
const CLEAN_PROBES = 'ECONOMY_CLEAN_PROBES';
const CLEAN_SOURCES = 'ECON_CLEAN_SOURCES';

export const actionCreators = {
  enable() {
    return {
      type: ENABLE,
    };
  },
  spawn(name) {
    return {
      type: SPAWN,
      payload: name,
    };
  },
  search(room) {
    const sources = room.find(FIND_SOURCES);
    return {
      type: CLAIM_SOURCES,
      payload: sources
    }
  },
  harvest(probe, source) {
    return {
      type: HARVEST_SOURCE,
      payload: { probe, source },
    };
  },
  assignNewWork() {
    return {
      type: ASSIGN_NEW_WORK,
    };
  },
  cleanProbes(deadProbes) {
    return {
      type: CLEAN_PROBES,
      payload: deadProbes,
    };
  },
  cleanSources() {
    return {
      type: CLEAN_SOURCES,
    };
  }
};

const root = state => state.Economy;
const selectCreeps = state => Memory.creeps || {};
const selectIsEnabled = createSelector(
  root,
  economy => !!economy.enabled,
);
const selectProbes = createSelector(
  root,
  economy => economy.probes,
);
const selectNeedsProbe = createSelector(
  selectIsEnabled,
  selectProbes,
  (isEnabled, probes) => {
    return (isEnabled && probes.length <= PROBE_COUNT);
  }
);
const selectNeedsSpawn = createSelector(
  selectCreeps,
  selectProbes,
  (creeps, probes) => difference(probes, Object.keys(creeps)),
);
const selectActiveProbeNames = createSelector(
  selectCreeps,
  selectProbes,
  (creeps, probes) => intersection(Object.keys(creeps), probes),
);
const selectInfants = createSelector(
  selectCreeps,
  selectActiveProbeNames,
  (creeps, activeProbes) => activeProbes.filter(name => creeps[name].infant).map(name => creeps[name]),
);
const selectSources = createSelector(
  root,
  economy => economy.sources,
);
const selectSourceIds = createSelector(
  selectSources,
  sources => sources.map(source => source.id),
);
const selectSourceProbeRelationship = createSelector(
  selectActiveProbeNames,
  selectSources,
  (activeProbes, sources) => sources.map(source => ({
    source,
    probes: activeProbes.filter(probe => probe.mines === source.id)
  })),
)

const selectLeastMined = createSelector(
  selectSourceProbeRelationship,
  source => {
    return source.reduce((smallest, curr) => {
      if (smallest.probes.length > curr.probes.length) {
        return curr;
      }
      return smallest;
    }, {
      source: source[0],
      probes: { length: Infinity }
    }).source;
  }
)

const selectHarvestProbes = createSelector(
  selectActiveProbeNames,
  selectCreeps,
  (activeProbes, creeps) => activeProbes.filter(probe => !creeps[probe].infant).map(name => Game.creeps[name]).filter(a => a),
);

const selectDeadProbs = createSelector(
  selectProbes,
  selectCreeps,
  () => Game.creeps || {},
  (probes, creepsMem, creepsGame) =>
    intersection(
      difference(Object.keys(creepsMem), Object.keys(creepsGame)),
      probes,
    ),
);

export const selectors = {
  creeps: selectCreeps,
  isEnabled: selectIsEnabled,
  probes: selectProbes,
  needsProbes: selectNeedsProbe,
  activeProbeNames: selectActiveProbeNames,
  infants: selectInfants,
  sources: selectSources,
  sourceIds: selectSourceIds,
  sourceProbeRelationship: selectSourceProbeRelationship,
  leastMined: selectLeastMined,
  harvestProbes: selectHarvestProbes,
  deadProbes: selectDeadProbs,
};

const probeBody = [WORK, MOVE, WORK, CARRY];
const probeMemory = () => ({ memory: { role: 'probe', infant: true } });

export function init(store) {
  global.Econ = {
    ...mapValues(actionCreators, action => (...args) => store.dispatch({
      type: 'EXE',
      payload: action(...args),
    })),
    selectors: mapValues(selectors, selector => () => selector(store.getState())),
  };
}

function *watchEnabled() {
  yield takeEvery(ENABLE, function *onEnabled() {
    yield put(actionCreators.search(Game.spawns['Spawn1'].room));
  });
}

function* watchNewWork() {
  yield takeEvery(ASSIGN_NEW_WORK, function* onNewProbe() {
    const infants = yield select(selectInfants);
    const source = yield select(selectLeastMined);
    infants.forEach(creep => {
      creep.mine = source.id;
      delete creep.infant;
    });
  });
}

function* run() {
  yield takeEvery(RUN, function* onRun() {
    yield put(actionCreators.enable());
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
      const source = Game.getObjectById(creep.memory.mine);
      if (creep.carry.energy < creep.carryCapacity) {
        acquireTask(creep, creepTasks.harvest(), source);
      } else {
        const destination = creep.room.find(
          FIND_STRUCTURES,
          {
            filter: structure => (
              structure.structureType === STRUCTURE_EXTENSION
              || structure.structureType === STRUCTURE_CONTAINER
              || structure.structureType === STRUCTURE_SPAWN),
          },
        );
        const needsEnergy = destination.filter(structure => structure.energy < structure.energyCapacity);
        const needsStorage = destination.filter(structure => structure.store && structure.store[RESOURCE_ENERGY] < structure.storeCapacity);

        if(needsEnergy.length > 0) {
          const target = creep.pos.findClosestByRange(needsEnergy);
          acquireTask(creep, creepTasks.transfer(RESOURCE_ENERGY), target);
        } else if(needsStorage.length > 0) {
          const target = creep.pos.findClosestByRange(needsStorage);
          acquireTask(creep, creepTasks.transfer(RESOURCE_ENERGY), target);
        } else {
          const target = creep.pos.findClosestByRange(destination);
          moveTo(creep, target)
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
  enabled: false,
  probes: [],
  sources: [],
};

createReducer('Economy', initialState, {
  [ENABLE](state) {
    return {
      ...state,
      enabled: true,
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

createModule('Economy', {
  selectors,
  actionCreators,
});
