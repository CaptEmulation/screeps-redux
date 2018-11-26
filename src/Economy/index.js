import get from 'lodash.get';
import mapValues from 'lodash.mapvalues';
import differenceWith from 'lodash.differencewith';
import difference from 'lodash.difference';
import cond from 'lodash.cond';
import intersection from 'lodash.intersection';
import range from 'lodash.range';
import { call, put, select, takeEvery } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import { actionCreators as spawnActions } from '../Spawn';
import { happy } from '../utils/id';
import {
  worker,
  supply,
} from '../Creeps/builds';
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

const PROBE_COUNT = 6;
const WORKER_COUNT = 6;
const SUPPLY_COUNT = 4;
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
const selectGameCreeps = state => Game.creeps || {};
const selectIsEnabled = createSelector(
  root,
  economy => !!economy.enabled,
);
const selectProbes = createSelector(
  selectGameCreeps,
  mCreeps => Object.keys(mCreeps).reduce((memo, curr) => {
    if (mCreeps[curr].memory && mCreeps[curr].memory.role === 'worker') {
      memo.push(curr);
    }
    return memo;
  }, []),
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
    workers: activeProbes.filter(probe => probe.mines === source.id)
  })),
)

const selectLeastMined = createSelector(
  selectSourceProbeRelationship,
  source => {
    return source.reduce((smallest, curr) => {
      if (smallest.workers.length > curr.workers.length) {
        return curr;
      }
      return smallest;
    }, {
      source: source[0],
      workers: { length: Infinity }
    }).source;
  }
);

const selectHarvestProbes = createSelector(
  selectGameCreeps,
  creeps => Object.values(creeps).filter(creep => creep.memory && creep.memory.role === 'worker'),
);

const selectSuppliers = createSelector(
  selectGameCreeps,
  creeps => Object.values(creeps).filter(creep => creep.memory && creep.memory.role === 'supply'),
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
  activeProbeNames: selectActiveProbeNames,
  infants: selectInfants,
  sources: selectSources,
  sourceIds: selectSourceIds,
  sourceProbeRelationship: selectSourceProbeRelationship,
  leastMined: selectLeastMined,
  harvestProbes: selectHarvestProbes,
  suppliers: selectSuppliers,
  deadProbes: selectDeadProbs,
};

const earlyCreeps = range(0, SUPPLY_COUNT).map(num => ({
  name: `Supply-${num}`,
  controller: 'Economy',
  body: supply.early,
  memory: {
    role: 'supply',
  },
  priority: -1,
}));

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

function walkBox(terrain, pos, size) {
  const depth = (size - 1) / 2;
  const spots = [];
  for (let x = -depth; x <= depth; x++) {
    spots.push(terrain.get(pos.x + x, pos.y - depth));
  }
  for (let y = -(depth - 1); y <= (depth - 1); y++) {
    spots.push(terrain.get(pos.x - depth, pos.y + y));
    spots.push(terrain.get(pos.x + depth, pos.y + y));
  }
  for (let x = -depth; x <= depth; x++) {
    spots.push(terrain.get(pos.x + x, pos.y + depth));
  }
  return spots;
}

function freeSpotsAtSource(source) {
  const terrain = new Room.Terrain(source.room.name);
  const openSpots = walkBox(terrain, source.pos, 3).filter(t => t === 0).length;
  return openSpots > 5 ? 5 : openSpots;
}

function findKnownSources() {
  const sources = [
    ...Game.spawns['Spawn1'].room.find(FIND_SOURCES),
  ];
  Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Scout')
    .map(scout => scout.room.find(FIND_SOURCES))
    .forEach(roomSources => roomSources.forEach(source => {
      if (!sources.find(s => s.id === source.id)) {
        sources.push(source);
      }
    }));
  return sources;
}

function mapSpots(sources) {
  return sources.map(source => {
    const spots = freeSpotsAtSource(source);
    const takenSpots = Object.values(Game.creeps).filter(creep => creep.memory.mine === source.id).length;
    const spotsRemaining = spots - takenSpots;
    return {
      source,
      free: spots,
      spotsRemaining,
    };
  });
}

function assignMines(creeps) {
  const unassignedCreeps = creeps.filter(creep => !creep.memory.mine);
  const findRoomAtSources = mapSpots(findKnownSources());
  creeps.filter(creep => !creep.memory.mine).forEach(creep => {
    const availableSpots = findRoomAtSources.filter(({
      spotsRemaining,
    }) => spotsRemaining > 0);
    const target = creep.pos.findClosestByRange(availableSpots.map(spot => spot.source));
    if (target) {
      creep.memory.mine = target.id;
      // Update remaining spots
      availableSpots.find(spot => spot.source === target).spotsRemaining--
    }
  });
}

function unassignedSources(creeps, sources) {
  const assignedSources = creeps.filter(creep => creep.memory.mine).map(creep => creep.memory.mine);
  return sources.filter(source => !assignedSources.includes(source));
}

export function findEnergyDropOffs(room) {
  return room.find(
    FIND_STRUCTURES,
    {
      filter: structure => (
        structure.structureType === STRUCTURE_EXTENSION
        || structure.structureType === STRUCTURE_CONTAINER
        || structure.structureType === STRUCTURE_SPAWN),
    },
  );
}

export function moveToEnergy(creep, destinations) {
  destinations = destinations || findEnergyDropOffs(creep.room);
  const target = creep.pos.findClosestByRange(destinations);
  moveTo(creep, target)
}

export function dropOffEnergy(creep, destinations) {
  destinations = destinations || findEnergyDropOffs(creep.room);
  const needsEnergy = destinations.filter(structure => structure.energy < structure.energyCapacity);
  const needsStorage = destinations.filter(structure => structure.store && structure.store[RESOURCE_ENERGY] < structure.storeCapacity);
  if(needsEnergy.length > 0) {
    const target = creep.pos.findClosestByRange(needsEnergy);
    acquireTask(creep, creepTasks.transfer(RESOURCE_ENERGY), target);
    return true;
  } else if(needsStorage.length > 0) {
    const target = creep.pos.findClosestByRange(needsStorage);
    acquireTask(creep, creepTasks.transfer(RESOURCE_ENERGY), target);
    return true;
  } else {
    return false;
  }
}

function* run() {
  yield takeEvery(RUN, function* onRun() {
    yield put(actionCreators.enable());
    const sourceCount = mapSpots(findKnownSources()).reduce((sum, curr) => sum + curr.free, 0);
    yield put(spawnActions.need([...range(0, sourceCount).map(num => ({
      name: `Worker-${num}`,
      controller: 'Economy',
      body: worker.early,
      memory: {
        role: 'worker',
      },
      priority: -2,
    })), ...earlyCreeps]));

    const harvestProbes = yield select(selectHarvestProbes);
    // harvestProbes.forEach(h => delete h.memory.mine);
    if (harvestProbes.some(worker => !worker.memory.mine)) {
      assignMines(harvestProbes);
    }
    for (let i = 0; i < harvestProbes.length; i++) {
      const creep = harvestProbes[i];
      // if (!creep.memory.mine) {
      //
      //   const sources = creep.room.find(FIND_SOURCES)
      //     .map(source => source.id)
      //     .map(source => ({
      //       source,
      //       workers: harvestProbes.filter(worker => worker.memory.mine === source)
      //     }));
      //   const source = sources
      //     .reduce((smallest, curr) => {
      //       if (smallest.workers.length > curr.workers.length) {
      //         return curr;
      //       }
      //       return smallest;
      //     }, {
      //       source: sources[0],
      //       workers: { length: Infinity }
      //     }).source;
      //     console.log(source);
      //     creep.memory.mine = source;
      // }
      const source = Game.getObjectById(creep.memory.mine);
      acquireTask(creep, creepTasks.harvest(), source);
    }
    const suppliers = yield select(selectSuppliers);

    for (let i = 0; i < suppliers.length; i++) {
      const creep = suppliers[i];
      if (creep.carry.energy < creep.carryCapacity) {
        const droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {
          filter(resource) {
            return resource.energy > creep.carryCapacity;
          }
        });
        if (droppedEnergy && droppedEnergy.length) {
          const mostEnergy = droppedEnergy.reduce((memo, curr) => {
            if (!memo || curr.energy > memo.energy) {
              return curr;
            }
            return memo
          });
          acquireTask(creep, creepTasks.pickup(), mostEnergy);
        }
      } else {
        const destinations = findEnergyDropOffs(creep.room);
        if (!dropOffEnergy(creep, destinations)) {
          moveToEnergy(creep, destinations);
        }
      }
    }
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
