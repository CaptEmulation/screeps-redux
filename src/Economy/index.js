import uniqBy from 'lodash.uniqby';
import { call, put, select, takeEvery } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import { actionCreators as spawnActions } from '../Spawn';
import { happy } from '../utils/id';
import {
  worker as workerBuild,
  supply as supplyBuild,
} from '../Creeps/builds';
import createReducer from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';
import {
  tasks as creepTasks,
  acquireTask,
} from '../utils/creeps';
import {
  walkBox,
  creepsByRoom,
} from '../utils/scan';
import {
  RUN,
  SCAN,
} from '../events';
import {
  target as targetMatcher,
} from '../utils/matchers';

const SUPPLY_COUNT = 3;
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
  (creeps, probes) => _.difference(probes, Object.keys(creeps)),
);
const selectActiveProbeNames = createSelector(
  selectCreeps,
  selectProbes,
  (creeps, probes) => _.intersection(Object.keys(creeps), probes),
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
    _.intersection(
      _.difference(Object.keys(creepsMem), Object.keys(creepsGame)),
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
    ..._.mapValues(actionCreators, action => (...args) => store.dispatch({
      type: 'EXE',
      payload: action(...args),
    })),
    selectors: _.mapValues(selectors, selector => () => selector(store.getState())),
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

function assignMines(creeps, max = 1) {
  const unassignedCreeps = creeps.filter(creep => !creep.memory.mine);
  const findRoomAtSources = mapSpots(findKnownSources());
  const assignedSources = creeps.filter(creep => creep.memory.mine).map(creep => creep.memory.mine);
  // const available = totalOpen > 2 ? 2 : totalOpen;
  // const taken = Object.values(Game.creeps).filter(creep => creep.memory.mine === source.id).length;
  unassignedCreeps.forEach(creep => {
    const thing = findRoomAtSources.find(({ source, open }) => {
      const thisSourceAssignedTo = assignedSources.filter(s => s === source.id);
      return thisSourceAssignedTo.length < max;
    });
    const source = thing && thing.source;

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
        || structure.structureType === STRUCTURE_STORAGE
        || structure.structureType === STRUCTURE_SPAWN),
    },
  );
}

export function moveToEnergy(creep, destinations) {
  destinations = destinations || findEnergyDropOffs(creep.room);
  const target = creep.pos.findClosestByRange(destinations);
  return creep.routeTo(target);
}

export function dropOffEnergy(creep, destinations) {
  destinations = destinations || findEnergyDropOffs(creep.room);
  const needsEnergy = destinations.filter(structure => structure.energy < structure.energyCapacity);
  const needsStorage = destinations.filter(structure => {
    const isRoom = structure.store && _.sum(structure.store) < structure.storeCapacity;
    // Only put minerals in storage
    if (isRoom && creep.carry[RESOURCE_ENERGY] < _.sum(creep.carry)) {
      return isRoom && structure.structureType === STRUCTURE_STORAGE
    }
    return isRoom;
  });
  if(creep.carry[RESOURCE_ENERGY] && needsEnergy.length > 0) {
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
    const target = _.min(needsStorage, s => _.sum(s.store));
    let amount;
    const totalInStore = _.sum(target.store);
    const resource = Object.entries(creep.carry).filter(([type, amount]) => amount > 0)[0][0];
    if((target.storeCapacity - totalInStore) > creep.carry[resource]) {
      amount = creep.carry[resource]
    } else {
      amount = target.storeCapacity - totalInStore;
    }
    acquireTask(creep, creepTasks.transfer(resource, amount), target);

    return true;
  } else {o
    return false;
  }
}

function locateMiningThings() {
  const sources = findKnownSources();
  const rooms = uniqBy(sources, (a) => a.room.roomName);
  const result = sources.map(({ id: sourceId}) => ({ sourceId }));
  rooms.forEach((room) => {
    const containers = room.find(FIND_MY_STRUCTURES, {
      filter: (target) => target.structureType === STRUCTURE_CONTAINER,
    });
    room.memory.sources = mapSpots(sources).map(data => {
      data.source = data.source.id;
      // Find nearby containers for outgoing storage
      const closeContainers = containers.filter(containers => source.pos.getRangeTo(container) <= 2);
      if (closeContainers) {
        data.containers = closeContainers.map(({
          id,
          pos,
        }) => ({
          id,
          pos,
        }));
      }
      return data;
    });
  });
}

function *scan() {
  yield takeEvery(SCAN, function* () {
    if (Game.time % 50) {
      // locateMiningThings();
    }
  });
}

const DEFAULT_WORKER_PRIORITY = -50;
const DEFAULT_SUPPLY_PRIORITY = -40;

let lastNeeds;

function* run() {
  yield takeEvery(RUN, function* onRun() {
    const now = Game.cpu.getUsed();
    // const sourceCount = mapSpots(findKnownSources()).reduce((sum, curr) => sum + (curr.open.length > 2 ? 2 : curr.open.length), 0);
    const sourceCount = findKnownSources().length;
    const currentWorkers = Object.values(Game.creeps).filter(c => c.memory && c.memory.role === 'worker');
    const currentSuppliers = Object.values(Game.creeps).filter(c => c.memory && c.memory.role === 'supply');
    const roomInfos = creepsByRoom();
    if (!lastNeeds || Game.time % 8 === 0) {
      lastNeeds = roomInfos.reduce((n, { room, creeps }) => {
        if (room.find(FIND_MY_STRUCTURES, {
          filter: targetMatcher.isSpawn,
        })) {
          let workerPriority = DEFAULT_SUPPLY_PRIORITY;
          let supplyPriority = DEFAULT_SUPPLY_PRIORITY;
          let supplyCount = 2;
          if (!(creeps.worker && creeps.worker.length) && !(creeps.supply && creeps.supply.length)) {
            workerPriority *= 2;
          } else if (!(creeps.supply && creeps.supply.length)) {
            supplyPriority *= 2;
          }
          const sourceCount = room.find(FIND_SOURCES).length;
          n.push(..._.range(0, sourceCount).map(num => ({
            name: `Worker-${room.name}-${num}`,
            body: workerBuild.default,
            memory: {
              role: 'worker',
              home: room.name,
            },
            priority: workerPriority,
            room: room.name,
          })), ..._.range(0, supplyCount).map(num => ({
            name: `Supply-${room.name}-${num}`,
            body: supplyBuild.default,
            memory: {
              role: 'supply',
              home: room.name,
            },
            priority: supplyPriority,
            room: room.name,
          })));
        }
        return n;
      }, []);
    }

    yield put(spawnActions.need({
      needs: [],
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
      if (!(creep.carry[RESOURCE_ENERGY] < _.sum(creep.carry)) && creep.carryCapacity - _.sum(creep.carry) > (0.95 * creep.carryCapacity)) {
        if (creep.memory.pickupPos) {
          const { x, y, roomName } = creep.memory.pickupPos;
          const pos = new RoomPosition(x, y, roomName);
          if (pos.getRangeTo(creep) === 1
            || !pos.lookFor(LOOK_ENERGY).find(target => target.amount > (creep.carryCapacity - creep.carry[RESOURCE_ENERGY]) / 2)
          ) {
            const pickupErr = acquireTask(creep, creepTasks.pickup(RESOURCE_ENERGY), _.max(pos.lookFor(LOOK_ENERGY), r => r.amount));
            if (pickupErr) {
              delete creep.memory.pickupPos;
            }
            continue;
          } else {
            creep.routeTo(pos);
            continue;
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
          if (creep.room.energyAvailable < (0.9 * creep.room.energyCapacityAvailable)) {
            const tombstones = creep.room.find(FIND_TOMBSTONES, {
              filter(target) {
                return _.sum(target.store) > 0;
              }
            });
            if (tombstones.length) {
              const target = creep.pos.findClosestByRange(tombstones);
              const resource = _.max(Object.entries(target.store), ([type, amount]) => amount)[0];
              const pickupErr = acquireTask(creep, creepTasks.withdraw(resource), target, creep.carryCapacity - creep.carry);
            } else {
              const sources = creep.room.find(FIND_MY_STRUCTURES, {
                filter(target) {
                  return (target.structureType === STRUCTURE_STORAGE
                    || target.structureType === STRUCTURE_CONTAINER)
                    && target.store[RESOURCE_ENERGY] > creep.carryCapacity;
                },
              });
              if (sources.length) {
                const target = creep.pos.findClosestByRange([...sources, ...droppedEnergy]);
                if (target instanceof Resource) {
                  const pickupErr = acquireTask(creep, creepTasks.pickup(RESOURCE_ENERGY), target, creep.carryCapacity - creep.carry);
                } else {
                  const pickupErr = acquireTask(creep, creepTasks.withdraw(RESOURCE_ENERGY), target, creep.carryCapacity - creep.carry);
                }

              }
            }
          } else if (droppedEnergy && droppedEnergy.length) {
            const closestEnergy = droppedEnergy.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
            const mostEnergy = droppedEnergy.reduce((memo, curr) => {
              if (!memo
                || curr.amount > memo.amount) {
                return curr;
              }
              return memo
            });
            // closestEnergy[0].pos.getRangeTo(creep) < 5 ? closestEnergy[0] :
            let pickUpEnergy = mostEnergy;
            const pickupErr = acquireTask(creep, creepTasks.pickup(RESOURCE_ENERGY), pickUpEnergy);
            if (pickupErr === ERR_NOT_IN_RANGE) {
              creep.memory.pickupPos = pickUpEnergy.pos;
            } else if (!pickupErr) {
              creep.say(happy(2));
              delete creep.memory.pickupPos;
            }
          }
        }
      } else {
        const destinations = findEnergyDropOffs(creep.room);
        if (!dropOffEnergy(creep, destinations)) {
          if (creep.memory.pickupPos) {
            const { x, y, roomName } = creep.memory.pickupPos;
            const pos = new RoomPosition(x, y, roomName);
            creep.routeTo(pos);
          } else {
            moveToEnergy(creep, destinations);
          }
        }
      }
    }
    // if (Game.time % 25 === 0) console.log('Econ RUN', Game.cpu.getUsed() - now);
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
      sources: [..._.differenceWith(state.sources, sources, (a, b) => a.sourceId === b.sourceId), ...sources],
    }
  },
});

createModule('Economy', {
  selectors,
  actionCreators,
});
