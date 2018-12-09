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
      let supplyCount = 1;//room.controller && (room.controller.level < 3 ? 4 : 3) || 0;
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
        },
        priority: supplyPriority,
        room: room.name,
      })));
    }
    return n;
  }, []);
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
    }
  },
  scan: profiler('Hauler SCAN', function * haulerScan({
    selectors,
    actionCreators,
  }) {
    const haulingRooms = Object.values(Game.rooms).filter(room => {
      return room.memory.haul && (Game.time % room.memory.haul.scan === 0);
    });
    const oldMeta = yield select(selectors.brood);
    const tasks = yield select(selectors.tasks);
    const creeps = yield select(selectors.alive);
    const newMeta = {};
    if (Game.time % 5 === 0) {
      for (let room of haulingRooms) {
        if (!room.memory.sources) {
          room.memory.sources = room.find(FIND_SOURCES).map(source => ({
            id: source.id,
            pos: [source.pos.x, source.pos.y, source.pos.roomName],
          }));
        }

        const containerlessSourceRefs = room.memory.sources.filter(s => !s.container);
        if (containerlessSourceRefs.length) {
          const containers = room.find(FIND_STRUCTURES, {
            filter: (target) => target.structureType === STRUCTURE_CONTAINER
          });
          for (let sourceRef of containerlessSourceRefs) {
            const sourcePos = new RoomPosition(...sourceRef.pos);
            const container = containers.find(container => container.pos.getRangeTo(sourcePos) <= 2);
            if (container) {
              sourceRef.container = {
                container: container.id,
                pos: [container.pos.x, container.pos.y, container.pos.roomName],
              };
            }
          }
        }

        const droppedEnergy = room.find(FIND_DROPPED_RESOURCES, {
          filter(resource) {
            return !tasks.find(t => t.id === resource.id);
          }
        })
          .sort((a, b) => b.amount - a.amount)
          .forEach(resource => {
            tasks.push({
              id: resource.id,
              amount: resource.amount,
              type: resource.resourceType,
              action: 'pickup',
              room: room.name,
            }, {
              from: resource.id,
              amount: resource.amount,
              type: resource.resourceType,
              action: 'transfer',
              room: room.name,
            });
          });

        const energyDropOffs = room.find(FIND_MY_STRUCTURES, {
          filter(target) {
            return (target.structureType === STRUCTURE_SPAWN
              || target.structureType === STRUCTURE_EXTENSION
              || target.structureType === STRUCTURE_TOWER);
          }
        });
        const storageDropOffs = room.find(FIND_MY_STRUCTURES, {
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
        const pendingEnergyDeliveries = tasks.filter(t => t.from && !t.id && t.type === RESOURCE_ENERGY);
        const pendingEnergyPickupPositions = pendingEnergyDeliveries.reduce((memo, t) => {
          const pickupTask = tasks.find(pt => pt.id === t.id);
          if (pickupTask) {
            const pickupTarget = Game.getObjectById(pickupTask.id);
            if (pickupTarget) {
              memo.push(pickupTarget);
            }
          }
          return memo;
        }, []);
        const pendingStorageDeliveries = tasks.filter(t => t.from && !t.id && t.type !== RESOURCE_ENERGY);
        const pendingStoragePickupPositions = pendingStorageDeliveries.reduce((memo, t) => {
          const pickupTask = tasks.find(pt => pt.id === t.id);
          if (pickupTask) {
            const pickupTarget = Game.getObjectById(pickupTask.id);
            if (pickupTarget) {
              memo.push(pickupTarget);
            }
          }
          return memo;
        }, []);
        for (let dropoff of needsEnergy) {
          if (pendingEnergyDeliveries.length) {
            for (let pendingDelivery of pendingEnergyDeliveries) {
              const energyLocations = pendingEnergyPickupPositions.sort((a, b) => a.pos.getRangeTo(dropoff) - b.pos.getRangeTo(dropoff));
              let remaining = dropoff.energyCapacity - dropoff.energy;
              let index = 0;
              while(remaining > 0) {
                const target = energyLocations[index];
                if (!target) {
                  break;
                }
                let amountInPickup = target.amount;
                if (remaining < amountInPickup) {
                  pendingDelivery.id = target.id;
                  // Create a new task for the remainder
                  const remainingTask = {
                    from: pendingDelivery.from,
                    amount: amountInPickup - remaining,
                    action: 'transfer',
                    type: RESOURCE_ENERGY,
                    room: room.name,
                  };
                  newDropoffTasks.push(remainingTask);
                  pendingEnergyDeliveries.push(remainingTask);
                } else if (remaining >= amountInPickup) {
                  pendingDelivery.id = target.id;
                  _.pull(pendingEnergyDeliveries, )
                }
                remaining - amountInPickup;
                if (index++ >= energyLocations.length) {
                  break;
                }
              }
            }
          }
          const matchingTasks = tasks.filter(t => t.id === dropoff.id)
          if (matchingTasks.length === 0) {
            newDropoffTasks.push({
              id: dropoff.id,
              amount: dropoff.energyCapacity - dropoff.energy,
              action: 'transfer',
              type: RESOURCE_ENERGY,
              room: room.name,
            });
          } else {
            const totalOnTask = _.sum(matchingTasks, task => task.name && task.amount || 0);
            const pendingTasks = matchingTasks.filter(task => !task.name);

            if (totalOnTask > dropoff.energyCapacity && pendingTasks.length) {
              // Too much is pending
              _.pull(tasks, ...pendingTasks);
            } else if (pendingTasks.length > 1) {
              // Something got unassigned, merge them together
              _.pull(tasks, ...pendingTasks);
              newDropoffTasks.push({
                id: dropoff.id,
                amount: dropoff.energyCapacity - totalOnTask,
                action: 'transfer',
                type: RESOURCE_ENERGY,
                room: room.name,
              });
            }
          }
        }

        for (let dropoff of needsStorage) {
          const matchingTasks = tasks.filter(t => t.id === dropoff.id)
          if (matchingTasks.length === 0) {
            newDropoffTasks.push({
              id: dropoff.id,
              amount: dropoff.storeCapacity - _.sum(dropoff.store),
              action: 'transfer',
              type: RESOURCE_ENERGY,
              room: room.name,
            });
          } else {
            const totalOnTask = _.sum(matchingTasks, task => task.name && task.amount || 0);
            const pendingTasks = matchingTasks.filter(task => !task.name);

            if (totalOnTask > dropoff.energyCapacity && pendingTasks.length) {
              // Too much is pending
              _.pull(tasks, ...pendingTasks);
            } else if (pendingTasks.length > 1) {
              // Something got unassigned, merge them together
              _.pull(tasks, ...pendingTasks);
              newDropoffTasks.push({
                id: dropoff.id,
                amount: dropoff.energyCapacity - totalOnTask,
                action: 'transfer',
                type: RESOURCE_ENERGY,
                room: room.name,
              });
            }
          }
        }
        tasks.push(...newDropoffTasks);
        _.remove(tasks, task => !Game.getObjectById(task.id) || task.amount === 0);
      };
    }
  }),
  update: profiler('Hauler UPDATE', function* haulerUpdate({
    selectors,
    actionCreators,
  }) {
    if (!lastNeeds || Game.time % 8 === 0) {
      lastNeeds = yield call(createNeeds, {
        selectors,
        actionCreators,
      });
    }
    const tasks = yield select(selectors.tasks);
    const creeps = yield select(selectors.alive);
    tasks.forEach(task => {
      if (task.name && !Game.creeps[task.name]) {
        console.log('This creep no longer exists to fulfill task')
        delete task.name;
      }
    });
    const creepsNeedingTasks =
      _.difference(creeps.map(c => c.name), tasks.map(t => t.name))
      .map(name => Game.creeps[name]);

    const unfilledTasks = tasks.filter(task => !task.name && task.id);
    // Assign creeps to tasks
    for (let task of unfilledTasks) {
      const target = Game.getObjectById(task.id);
      if (target) {
        const closestCreep = target.pos.findClosestByRange(creepsNeedingTasks);
        if (closestCreep) {
          switch(task.action) {
            case 'transfer': {
              const carryAmount = closestCreep.carry[task.type] - _.get(closestCreep.memory, `transfer.${task.type}`, 0);
              if (carryAmount > 0) {
                const transferAmount = Math.min(closestCreep.carry[task.type], task.amount);
                closestCreep.memory.transfer[task.type] = closestCreep.memory.transfer[task.type] || 0;
                closestCreep.memory.transfer[task.type] += transferAmount;
                if (closestCreep.carry[task.type] < task.amount) {
                  tasks.push({
                    ...task,
                    amount: target.amount - transferAmount,
                  });
                }
                task.name = closestCreep.name;
              }
            }
          }
          const carryLeft = closestCreep.carryCapacity - _.sum(closestCreep.carry);
          if (carryLeft > 0) {
            if (target.amount > carryLeft) {
              // make a new task for the remaining
              tasks.push({
                ...task,
                amount: target.amount - carryLeft,
                name: null,
              });
            }
            task.name = closestCreep.name;
            _.pull(creepsNeedingTasks, closestCreep);
          }
        }
      }
    }
  }),
  run: profiler('Hauler RUN', function* haulerRun({
    selectors,
  }) {
    yield put(spawnActions.need({
      needs: lastNeeds,
      controller: 'Hauler',
    }));
    const tasks = yield select(selectors.tasks);
    const creeps = yield select(selectors.alive);
    for (let creep of creeps) {
      const task = creep.tasks[0];
      if (task) {
        const target = Game.getObjectById(task.id);
        console.log('Executing task for', task.name, 'to', task.id)
        if (!target) {
          console.log(`Object ${task.id} no longer exists`);
          _.pull(tasks, task);
          continue;
        }
        if (creep.pos.getRangeTo(target) > 1) {
          creep.routeTo(target, { range: 1 });
        } else {
          switch(task.action) {
            case 'pickup': {
              creep.say('pickup');
              const pickupErr = creep.pickup(target, task.amount, task.type);
              if (!pickupErr) {
                const deliverTask = tasks.find(t => t.from === task.id);
                if (deliverTask) {
                  deliverTask.name === creep.name;
                }
              }
              _.pull(tasks, task);
              break;
            }
            case 'transfer': {
              creep.say('transfer');
              console.log(target, task.amount, task.type)
              const transferErr = creep.transfer(target, task.type, task.amount);
              _.pull(tasks, task);
              if (transferErr) {
                console.log('transfer error', transferErr);
              } else {
                creep.memory.transfer[task.type] -= task.amount;
              }
              break;
            }
            default: {
              break;
            }
          }
        }
      }
    }
    for (let task of tasks) {
      if (task.name) {
        const creep = Game.creeps[task.name];

      }
    }
  }),
});
