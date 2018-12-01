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
  walkBox,
} from '../utils/scan';
import {
  RUN,
  SCAN,
} from '../events';

const PROBE_COUNT = 6;
const WORKER_COUNT = 6;
const SUPPLY_COUNT = 4;
const SCAN_RESULTS = 'ECONOMY_SCAN_RESULTS';

export const actionCreators = {
  scanResults(results) {
    return {
      type: SCAN_RESULTS,
      payload: results,
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
    workers: activeProbes.filter(probe => probe.mine === source.id)
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


function economyNeeds() {
  const unassignedCreeps = creeps.filter(creep => !creep.memory.mine);
  const findRoomAtSources = mapSpots(findKnownSources());
  // const available = totalOpen > 2 ? 2 : totalOpen;
  // const taken = Object.values(Game.creeps).filter(creep => creep.memory.mine === source.id).length;
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

export function init(store) {
  global.Econ = {
    ...mapValues(actionCreators, action => (...args) => store.dispatch({
      type: 'EXE',
      payload: action(...args),
    })),
    selectors: mapValues(selectors, selector => () => selector(store.getState())),
  };
}

function freeSpotsAtSource(source) {
  const terrain = new Room.Terrain(source.room.name);
  return [...walkBox(source.pos, 1)].filter(([x, y]) => terrain.get(x, y) === 0);
}

function findKnownSources() {
  const sources = [
    ...Game.spawns['Spawn1'].room.find(FIND_SOURCES),
  ];
  // Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Scout')
  //   .map(scout => scout.room.find(FIND_SOURCES))
  //   .forEach(roomSources => roomSources.forEach(source => {
  //     if (!sources.find(s => s.id === source.id)) {
  //       sources.push(source);
  //     }
  //   }));
  return sources;
}

function mapSpots(sources) {
  return sources.map(source => {
    const open = freeSpotsAtSource(source);
    return {
      source,
      open,
    };
  });
}

function assignMines(creeps, max = 2) {
  const unassignedCreeps = creeps.filter(creep => !creep.memory.mine);
  const findRoomAtSources = mapSpots(findKnownSources());
  const assignedSources = creeps.filter(creep => creep.memory.mine).map(creep => creep.memory.mine);
  // const available = totalOpen > 2 ? 2 : totalOpen;
  // const taken = Object.values(Game.creeps).filter(creep => creep.memory.mine === source.id).length;
  unassignedCreeps.forEach(creep => {
    const source = findRoomAtSources.find(({ source, open }) => {
      const thisSourceAssignedTo = assignedSources.filter(s => s === source.id);
      return thisSourceAssignedTo.length < max;
    }).source;

    if (source) {
      creep.memory.mine = source.id;
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
        || structure.structureType === STRUCTURE_TOWER
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
    let amount;
    if((target.energyCapacity - target.energy) > creep.carry[RESOURCE_ENERGY]) {
      amount = creep.carry[RESOURCE_ENERGY]
    } else {
      amount = target.energyCapacity - target.energy;
    }
    acquireTask(creep, creepTasks.transfer(RESOURCE_ENERGY, amount), target);
    return true;
  } else if(needsStorage.length > 0) {
    const target = creep.pos.findClosestByRange(needsStorage);
    let amount;
    const totalInStore = _.sum(target.store);
    if((target.storeCapacity - totalInStore) > creep.carry[RESOURCE_ENERGY]) {
      amount = creep.carry[RESOURCE_ENERGY]
    } else {
      amount = target.storeCapacity - totalInStore;
    }
    acquireTask(creep, creepTasks.transfer(RESOURCE_ENERGY, amount), target);
    return true;
  } else {
    return false;
  }
}

function *scan() {
  yield takeEvery(SCAN, function* () {
    const sources = findKnownSources();
    const rooms = _.uniqBy(sources, s => s.room.roomName);
    const result = sources.map(({ id: sourceId}) => ({ sourceId }));
    rooms.forEach((room) => {
      const containers = room.find(FIND_MY_STRUCTURES, {
        filter: (target) => target.structureType === STRUCTURE_CONTAINER,
      });

      sources.forEach((source) => {
        // Find nearby containers for outgoing storage
        const closeContainers = containers.filter(containers => source.pos.getRangeTo(container) <= 2);
        if (closeContainers) {
          const sourceResult = result.find(r => r.sourceId = source.id);
          sourceResult.containers = closeContainers.map(c => c.id);
        }

        // Figure out how much space is available for mining
      });
    });
  });
}

function* run() {
  yield takeEvery(RUN, function* onRun() {
    const sourceCount = mapSpots(findKnownSources()).reduce((sum, curr) => sum + (curr.open.length > 2 ? 2 : curr.open.length), 0);
    const currentWorkers = Object.values(Game.creeps).filter(c => c.memory && c.memory.role === 'worker');
    const currentSuppliers = Object.values(Game.creeps).filter(c => c.memory && c.memory.role === 'supply');
    yield put(spawnActions.need({
      needs: [...range(0, sourceCount).map(num => ({
        name: `Worker-${num}`,
        body: [MOVE, MOVE, WORK, WORK],
        memory: {
          role: 'worker',
        },
        priority: -10 + (2 * num),
      })), ...range(0, SUPPLY_COUNT).map(num => ({
        name: `Supply-${num}`,
        body: supply.early,
        memory: {
          role: 'supply',
        },
        priority: -9 + (2 * num),
      }))],
      room: Game.spawns['Spawn1'].room.name,
      controller: 'Economy',
    }));

    const harvestProbes = yield select(selectHarvestProbes);
    // harvestProbes.forEach(h => delete h.memory.mine);
    if (harvestProbes.some(worker => !worker.memory.mine)) {
      assignMines(harvestProbes);
    }
    for (let i = 0; i < harvestProbes.length; i++) {
      const creep = harvestProbes[i];
      const source = Game.getObjectById(creep.memory.mine);
      acquireTask(creep, creepTasks.harvest(), source);
    }
    const suppliers = yield select(selectSuppliers);

    for (let i = 0; i < suppliers.length; i++) {
      const creep = suppliers[i];
      if (creep.carryCapacity - _.sum(creep.carry) > (0.95 * creep.carryCapacity)) {
        if (creep.memory.pickupPos) {
          const { x, y, roomName } = creep.memory.pickupPos;
          const pos = new RoomPosition(x, y, roomName);
          if (pos.getRangeTo(creep) === 1
            || !pos.lookFor(LOOK_ENERGY).find(target => target.amount > (creep.carryCapacity - creep.carry[RESOURCE_ENERGY]) / 2)
          ) {
            acquireTask(creep, creepTasks.pickup(RESOURCE_ENERGY), pos);
            delete creep.memory.pickupPos;
          } else {
            moveTo(creep, pos);
          }
        }
        if (!creep.memory.pickupPos) {
          const creepsEnrouteToPickup = Object.values(Game.creeps)
            .filter(c => c.memory && c.memory.pickupPos);
          const droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter(resource) {
              return !creepsEnrouteToPickup.find(c =>
                  c.memory
                  && c.memory.pickupPos
                  && c.memory.pickupPos.x === resource.pos.x
                  && c.memory.pickupPos.y === resource.pos.y
                  && c.memory.pickupPos.roomName === resource.pos.roomName
                  && (resource.amount - (c.carryCapacity - c.carry[RESOURCE_ENERGY])) > (creep.carryCapacity - creep.carry[RESOURCE_ENERGY])
                && resource.amount > (creep.carryCapacity - creep.carry[RESOURCE_ENERGY]))
            }
          });
          if (droppedEnergy && droppedEnergy.length) {
            const closestEnergy = droppedEnergy.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
            const mostEnergy = droppedEnergy.reduce((memo, curr) => {
              if (!memo
                || curr.amount > memo.amount) {
                return curr;
              }
              return memo
            });
            let pickUpEnergy = closestEnergy[0].pos.getRangeTo(creep) < 5 ? closestEnergy[0] : mostEnergy;
            const pickupErr = acquireTask(creep, creepTasks.pickup(RESOURCE_ENERGY), pickUpEnergy);
            if (pickupErr === ERR_NOT_IN_RANGE) {
              creep.memory.pickupPos = pickUpEnergy.pos;
            } else if (!pickupErr) {
              delete creep.memory.pickupPos;
            }
          }
        }
      } else {
        const destinations = findEnergyDropOffs(creep.room);
        if (!dropOffEnergy(creep, destinations)) {
          if (creep.memory.pickupPos) {
            moveTo(creep, creep.memory.pickupPos);
          } else {
            moveToEnergy(creep, destinations);
          }
        }
      }
    }
  });
}

createSaga(
  scan,
  run,
);

const initialState = {
  enabled: true,
  sources: [],
};

createReducer('Economy', initialState, {
  [SCAN_RESULTS](state, { payload: results }) {
    return {
      ...state,
      sources: [...differenceWith(state.sources, sources, (a, b) => a.sourceId === b.sourceId), ...sources],
    }
  },
});

createModule('Economy', {
  selectors,
  actionCreators,
});
