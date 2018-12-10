import { call, put, select } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import {
  supply as supplyBuild,
} from '../Creeps/builds';
import { actionCreators as spawnActions } from '../Spawn';
import createBrood from '../Creeps/brood';
import {
  actionCreators as mapActions,
  selectors as mapSelectors,
} from '../Map';
import {
  findEnergyDropOffs,
  dropOffEnergy,
} from '../Economy';
import {
  acquireTask,
  tasks as creepTasks,
  findClosestEnergy,
} from '../utils/creeps';
import findPath from '../utils/findPath';
import {
  creepsByRoom,
  walkBox
} from '../utils/scan';
import {
  target as targetMatcher,
} from '../utils/matchers'
import profiler from '../utils/generatorProfiler';

const DEFAULT_SUPPLY_PRIORITY = -40;

let lastNeeds;
let lastTasks;

function* createNeeds({
  selectors,
  actionCreators,
}) {
  const roomInfos = creepsByRoom();
  const brood = yield select(selectors.brood);
  return roomInfos.reduce((n, { room, creeps }) => {
    if (room.find(FIND_MY_STRUCTURES, {
      filter: targetMatcher.isSpawn,
    })) {
      let supplyPriority = DEFAULT_SUPPLY_PRIORITY;
      let supplyCount = 2;//room.controller && (room.controller.level < 3 ? 4 : 3) || 0;
      if (!(creeps.supply && creeps.supply.length)) {
        supplyPriority *= 2;
      }
      n.push(..._.range(0, supplyCount).map(num => ({
        name: `Hauler-${room.name}-${num}`,
        body: supplyBuild.default,
        memory: {
          role: 'Hauler',
          home: room.name,
          transfer: {},
          pickup: {},
        },
        priority: supplyPriority,
        room: room.name,
      })));
    }
    return n;
  }, []);
}

function amountAssignedTo(creep, action, tasks) {
  return _.sum(
    tasks.filter(t => t.action === action && t.name === creep.name),
    t => t.amount,
  );
}
function taskAmountForId(id) {
  return function amountforTargetIdItr(task) {
    return task.id === id && task.amount || 0;
  };
}

function amountFromTarget(target) {
  let amount;
  if (target instanceof Resource) {
    amount = target.amount;
  } else if (
    target instanceof StructureStorage
    || target instanceof StructureContainer
  ) {
    amount = _.sum(target.store);
  } else {
    throw new Error('Unknown target', target);
  }
  return amount;
}

function bestAmountPickup(target, amount, tasks) {
  return function bestAmountPickupItr(a, b) {
    return
    (Math.min(
      (amountFromTarget(b) - _sum(tasks, taskAmountForId(b.id))),
      amount
    ) / target.pos.getRangeTo(b))
    - (Math.min(
      (amountFromTarget(a) - _sum(tasks, taskAmountForId(a.id))),
      amount
    ) / target.pos.getRangeTo(a));
  }
}

function actionForPickupTarget(target) {
  if (target instanceof Resource) {
    return 'pickup';
  }
  if (target instanceof StructureContainer
    || target instanceof StructureStorage
  ) {
    return 'withdraw';
  }
  throw new Error('Unknown target', target);
}

/*
 * Example tasks
 *
 * brood.tasks = [{
 *   creep: 'Hauler-0',
 *   target: id,
 *   action: string,
 *   amount: number,
 *   resource: RESOURCE_TYPE,
 *   room: string,
 * }]
 */

createBrood({
  role: 'Hauler',
  initialState: {
    tasks: [],
  },
  selectors: selectors => {
    const selectTasks = createSelector(
      selectors.brood,
      brood => brood.tasks,
    );
    return {
      tasks: selectTasks,
    };
  },
  start: function* haulerStart({
    selector,
  }) {
    const creeps = Object.values(Game.creeps).filter(c => c.memory && c.memory.role === 'Hauler');
    for (let creep of creeps) {
      creep.memory.transfer = creep.memory.transfer || {};
      creep.memory.pickup = creep.memory.pickup || {};
      delete creep.memory.tasks;
    }
  },
  scan: profiler('Hauler SCAN', function * haulerScan({
    selectors,
    actionCreators,
  }) {
    const haulingRooms = Object.values(Game.rooms).filter(room => {
      return room.memory.haul;
    });
    const tasks = yield select(selectors.tasks);
    const creeps = yield select(selectors.alive);
    // Fix things.....
    if (Game.time % 100) {
      tasks.forEach(t => tasks.pop());
    }
    if (true) {
      for (let room of haulingRooms) {
        if (!room.memory.sources) {
          room.memory.sources = room.find(FIND_SOURCES).map(source => ({
            id: source.id,
            pos: [source.pos.x, source.pos.y, source.pos.roomName],
          }));
        }

        const containerlessSourceRefs = room.memory.sources.filter(s => !s.container || (s.container && s.container.container));
        if (containerlessSourceRefs.length) {
          const containers = room.find(FIND_STRUCTURES, {
            filter: (target) => target.structureType === STRUCTURE_CONTAINER
          });
          for (let sourceRef of containerlessSourceRefs) {
            const sourcePos = new RoomPosition(...sourceRef.pos);
            const container = containers.find(container => container.pos.getRangeTo(sourcePos) <= 2);
            if (container) {
              sourceRef.container = {
                id: container.id,
                pos: [container.pos.x, container.pos.y, container.pos.roomName],
              };
            }
          }
        }

        const newResourceDrops = [];

        const droppedResources = room.find(FIND_DROPPED_RESOURCES);
        const energyDropOffs = room.find(FIND_MY_STRUCTURES, {
          filter(target) {
            return (target.structureType === STRUCTURE_SPAWN
              || target.structureType === STRUCTURE_EXTENSION
              || target.structureType === STRUCTURE_TOWER);
          }
        });
        const storageDropOffs = room.find(FIND_STRUCTURES, {
          filter(target) {
            return target.structureType === STRUCTURE_CONTAINER
              || target.structureType === STRUCTURE_STORAGE;
          },
        });

        const needsEnergy = energyDropOffs.filter(structure => structure.energy < structure.energyCapacity);
        const needsStorage = storageDropOffs.filter(structure => {
          return _.sum(structure.store) < structure.storeCapacity;
        });



        const newDropoffTasks = [];
        const haveEnergyCreeps = creeps.filter(c => c.carry[RESOURCE_ENERGY]);

        // Find haulers that have energy and available pending tasks
        const haveEnergyCapacityCreeps = haveEnergyCreeps.filter(creep =>
          (_.sum(creep.carry) -  amountAssignedTo(creep, 'transfer', tasks)) > 0,
        );
        // targets that have no pending energy deliveries
        const needsDeliveryEnergyTargets = needsEnergy.filter(target => {
          const pendingAmount = _.sum(tasks, taskAmountForId(target.id));
          return (target.energyCapacity - target.energy - pendingAmount) > 0;
        });
        for (let creep of haveEnergyCapacityCreeps) {
          if (needsDeliveryEnergyTargets.length) {
            const lastTransferTargetIndex = _.findLastIndex(tasks, t => t.action === 'transfer' && t.name === creep.name);
            let lastTransferTarget;
            if (lastTransferTargetIndex !== -1) {
              lastTransferTarget = Game.getObjectById(tasks[lastTransferTargetIndex].id);
              if (!lastTransferTarget) {
                console.log('Not able to find last transfer target');
              }
            } else {
              // If there are no pending transfer targets, set self as target
              lastTransferTarget = creep;
            }
            let transferAmount = amountAssignedTo(creep, 'transfer', tasks);
            while(transferAmount < _.sum(creep.carry)) {
              // Find a nearby target
              const nextTarget = lastTransferTarget.pos.findClosestByRange(needsDeliveryEnergyTargets);
              if (nextTarget) {
                const availabeOnCreep = _.sum(creep.carry) - transferAmount;
                const pendingAmountForTarget = _.sum([...tasks, ...newDropoffTasks], taskAmountForId(nextTarget.id));
                const availableAmountForTarget = nextTarget.energyCapacity - nextTarget.energy - pendingAmountForTarget;
                const dropOffAmount = Math.min(availableAmountForTarget, availabeOnCreep);

                if (availableAmountForTarget < availabeOnCreep) {
                  // This dropoff will be full, so remove it from consideration
                  _.pull(needsDeliveryEnergyTargets, nextTarget);
                }
                newDropoffTasks.push({
                  id: nextTarget.id,
                  name: creep.name,
                  amount: dropOffAmount,
                  action: 'transfer',
                  type: RESOURCE_ENERGY,
                  room: room.name,
                });
                transferAmount += dropOffAmount;
                lastTransferTarget = nextTarget;
              } else {
                // Nothing more to do
                break;
              }
            }
          }
        }

        // Find haulers that have resources and available pending tasks
        const newTasks = [...tasks, ...newDropoffTasks];
        const haveResourceCapacityCreeps = creeps.filter(creep =>
          (_.sum(creep.carry) -  amountAssignedTo(creep, 'transfer', newTasks)) > 0,
        )
        for (let creep of haveResourceCapacityCreeps) {
          // targets that have no pending energy deliveries
          const needsDeliveryResourceTargets = needsStorage.filter(target => {
            const pendingAmount = _.sum(newTasks, taskAmountForId(target.id));
            return (target.storeCapacity - _.sum(target.store) - pendingAmount) > 0;
          });
          if (needsDeliveryResourceTargets.length) {
            const lastTransferTargetIndex = _.findLastIndex(newTasks, t => t.action === 'transfer' && t.name === creep.name);
            let lastTransferTarget;
            if (lastTransferTargetIndex !== -1) {
              lastTransferTarget = Game.getObjectById(newTasks[lastTransferTargetIndex].id);
              if (!lastTransferTarget) {
                console.log('Not able to find last transfer target');
                lastTransferTarget = creep;
              }
            } else {
              // If there are no pending transfer targets, set self as target
              lastTransferTarget = creep;
            }
            let transferAmount = amountAssignedTo(creep, 'transfer', newTasks);
            while(transferAmount < _.sum(creep.carry)) {
              // Find a nearby target
              // First look for containers
              let nextTarget = lastTransferTarget.pos.findClosestByRange(needsDeliveryResourceTargets.filter(t => t instanceof StructureContainer));
              if (!nextTarget) {
                nextTarget = lastTransferTarget.pos.findClosestByRange(needsDeliveryResourceTargets);
              }
              if (nextTarget) {
                const availabeOnCreep = _.sum(creep.carry) - transferAmount;
                const pendingAmountForTarget = _.sum([...tasks, ...newDropoffTasks], taskAmountForId(nextTarget.id));
                const availableAmountForTarget = nextTarget.storeCapacity -  _.sum(nextTarget.store) - pendingAmountForTarget;
                const dropOffAmount = Math.min(availableAmountForTarget, availabeOnCreep);

                if (availableAmountForTarget < availabeOnCreep) {
                  // This dropoff will be full, so remove it from consideration
                  _.pull(needsDeliveryResourceTargets, nextTarget);
                }
                newDropoffTasks.push({
                  id: nextTarget.id,
                  name: creep.name,
                  amount: dropOffAmount,
                  action: 'transfer',
                  // Fixme, should allow all types
                  type: RESOURCE_ENERGY,
                  room: room.name,
                });
                transferAmount += dropOffAmount;
                lastTransferTarget = nextTarget;
              } else {
                // Nothing more to do
                break;
              }
            }
          }
        }

        // Find haulers that can pickup energy
        const canPickupCreeps = creeps.filter(creep => _.sum(creep.carry) === 0);

        if (needsDeliveryEnergyTargets.length) {
          console.log('Considering', storageDropOffs, 'for pickup because energy is needed');
        }
        for (let creep of canPickupCreeps) {
          // Find resources that need to be picked up
          const availableResources = [...droppedResources.filter(resource => {
            const pendingAmount = _.sum(tasks, taskAmountForId(resource.id));
            return (resource.amount - pendingAmount) > 0;
          }), ...(needsDeliveryEnergyTargets.length ? storageDropOffs : [])];
          if (availableResources .length) {
            const lastPickupTargetIndex = _.findLastIndex(tasks, t => t.action === 'pickup' && t.name === creep.name);
            let lastPickupTarget;
            if (lastPickupTargetIndex !== -1) {
              lastPickupTarget = Game.getObjectById(tasks[lastPickupTargetIndex].id);
              if (!lastPickupTarget) {
                console.log('Not able to find last transfer target');
                lastPickupTarget = creep;
              }
            } else {
              // If there are no pending transfer targets, set self as target
              lastPickupTarget = creep;
            }
            let pickupAmount = amountAssignedTo(creep, 'pickup', tasks);
            // console.log('availableResources :', availableResources , 'lastPickupTarget:', lastPickupTarget, 'pickupAmount:', pickupAmount);
            while(pickupAmount < (creep.carryCapacity - _.sum(creep.carry))) {
              // Find a nearby target
              const availabeToPickupForCreep = creep.carryCapacity - _.sum(creep.carry) - pickupAmount;
              const sortedResources = availableResources.sort(bestAmountPickup(lastPickupTarget, availabeToPickupForCreep, [...tasks, ...newResourceDrops]));
              if (sortedResources.length) {
                const nextTarget = sortedResources[0];
                console.log('nextTarget:', nextTarget);
                const pendingAmountForResource = _.sum([...tasks, ...newResourceDrops], taskAmountForId(nextTarget.id));
                const availableAmountForResource = amountFromTarget(nextTarget) - pendingAmountForResource;
                const pickupAmountForResource = Math.min(availableAmountForResource, availabeToPickupForCreep);

                if (availableAmountForResource < availabeToPickupForCreep) {
                  // This pickup will deplete resource, so remove it from consideration
                  _.pull(availableResources , nextTarget);
                }
                const action = actionForPickupTarget(nextTarget);
                newResourceDrops.push({
                  id: nextTarget.id,
                  name: creep.name,
                  amount: pickupAmountForResource,
                  action,
                  type: RESOURCE_ENERGY,
                  room: room.name,
                });
                pickupAmount += pickupAmountForResource;
                lastPickupTarget = nextTarget;
              } else {
                // Nothing more to do
                break;
              }
            }
          }
        }

        tasks.push(...newResourceDrops, ...newDropoffTasks);
        const beforeRemoveLength = tasks.length;
        _.remove(tasks, task => !Game.getObjectById(task.id) || task.amount === 0);
        const removedTasks = beforeRemoveLength - tasks.length;
        const totalUnassigned = tasks.filter(task => !task.name);
        console.log('Total hauler tasks:', tasks.length, 'removed:', removedTasks, 'newResourceDrops:', newResourceDrops.length, 'newDropoffTasks:', newDropoffTasks.length, 'unassigned:', totalUnassigned.length);
      };
    }
  }),
  run: profiler('Hauler RUN', function* haulerRun({
    selectors,
    actionCreators,
  }) {
    if (!lastNeeds || Game.time % 8 === 0) {
      lastNeeds = yield call(createNeeds, {
        selectors,
        actionCreators,
      });
    }
    yield put(spawnActions.need({
      needs: lastNeeds,
      controller: 'Hauler',
    }));

    const tasks = yield select(selectors.tasks);
    const creeps = yield select(selectors.alive);
    for (let creep of creeps) {
      const myTasks = tasks.filter(t => t.name === creep.name);
      let task = myTasks.find(t => t.action === 'transfer');
      if (!task) {
        task = myTasks[0];
      }
      if (myTasks.length) {
        console.log(`${creep.name} has ${myTasks.length} to do`)
      }
      if (task) {
        const target = Game.getObjectById(task.id);
        if (target) {
          const range = creep.pos.getRangeTo(target);
          if (task.action === 'withdraw') {
            if (range > 1) {
              creep.routeTo(target, { range: 1 });
            } else {
              const creepAmount = creep.carryCapacity - creep.carry[task.type];
              const pickupAmount = Math.min(creepAmount, amountFromTarget(target));
              creep.say('withdraw');
              const pickupErr = creep.withdraw(target, task.type, pickupAmount);
              if (pickupErr) {
                console.log('withdraw error', pickupErr);
              }
              _.pull(tasks, task);
              console.log(`${creep.name} pickup task:${task.amount} targetAmount:${target.amount} creep:(${_.sum(creep.carry)}/${creep.carryCapacity})`);
            }
            continue;
          } else if (task.action === 'pickup') {
            if (range > 1) {
              creep.routeTo(target, { range: 1 });
            } else {
              const creepAmount = creep.carryCapacity - creep.carry[task.type];
              const pickupAmount = Math.min(creepAmount, target.amount);
              creep.say('pickup');
              const pickupErr = creep.pickup(target, pickupAmount, task.type);
              if (pickupErr) {
                console.log('pickup error', pickupErr);
              }
              _.pull(tasks, task);
              console.log(`${creep.name} pickup task:${task.amount} targetAmount:${target.amount} creep:(${_.sum(creep.carry)}/${creep.carryCapacity})`);
            }
            continue;
          } else if (task.action === 'transfer') {
            if (range > 1) {
              creep.routeTo(target, { range: 1 });
            } else {
              creep.say('transfer');
              let targetAmount;
              if ('energy' in target) {
                targetAmount = target.energyCapacity - target.energy;
              } else if (target.store && target.store[task.type]) {
                targetAmount = target.storeCapacity - _.sum(target.store);
              } else {
                console.log('what is', target);
              }
              let creepAmount = creep.carry[task.type];
              const transferAmount = Math.min(creepAmount, targetAmount);
              const transferErr = creep.transfer(target, task.type, transferAmount);
              _.pull(tasks, task);
              creep.memory.transfer[task.type] = Math.max(creep.memory.transfer[task.type] - task.amount, 0);
              if (transferErr) {
                console.log('transfer error', transferErr);
              } else {
                creepAmount -= transferAmount;
              }
              console.log(`${creep.name} transfer target:${target} task:${task.amount} targetAmount:${targetAmount} creep:(${_.sum(creep.carry)}/${creep.carryCapacity})`);
            }
            continue;
          }
        } else {
          console.log(`Object ${task.id} no longer exists`);
          _.pull(tasks, task);
        }
      }
    }
  }),
});
