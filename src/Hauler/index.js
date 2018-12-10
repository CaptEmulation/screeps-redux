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
    const oldMeta = yield select(selectors.brood);
    const tasks = yield select(selectors.tasks);
    const creeps = yield select(selectors.alive);
    // for (let task of tasks) {
    //   const target = Game.getObjectById(task.id);
    //   if (target) {
    //     tas
    //   }
    // }
    const newMeta = {};
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
        // room.find(FIND_DROPPED_RESOURCES, {
        //   filter(resource) {
        //     return !tasks.find(t => t.id === resource.id);
        //   }
        // })
        //   .sort((a, b) => b.amount - a.amount)
        //   .forEach(resource => {
        //     newEnergyDrops.push({
        //       id: resource.id,
        //       amount: resource.amount,
        //       type: resource.resourceType,
        //       action: 'pickup',
        //       room: room.name,
        //     });
        //   });

        // for (let resource of droppedResources) {
        //   // Just energy for now
        //   if (resource.resourceType === RESOURCE_ENERGY) {
        //
        //   }
        // }



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
        const haveEnergyCreeps = creeps.filter(c => c.carry[RESOURCE_ENERGY]);

        // Find haulers that have energy and available pending tasks
        const haveEnergyCapacityCreeps = haveEnergyCreeps.filter(creep =>
          (_.sum(creep.carry) -  amountAssignedTo(creep, 'transfer', tasks)) > 0,
        )
        for (let creep of haveEnergyCapacityCreeps) {
          // targets that have no pending energy deliveries
          const needsDeliveryEnergyTargets = needsEnergy.filter(target => {
            const pendingAmount = _.sum(tasks, taskAmountForId(target.id));
            return (target.energyCapacity - target.energy - pendingAmount) > 0;
          });
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

        // Find haulers that have energy and available pending tasks
        const haveEnergyCapacityCreeps = haveEnergyCreeps.filter(creep =>
          (_.sum(creep.carry) -  amountAssignedTo(creep, 'transfer', tasks)) > 0,
        )
        for (let creep of haveEnergyCapacityCreeps) {
          // targets that have no pending energy deliveries
          const needsDeliveryEnergyTargets = needsEnergy.filter(target => {
            const pendingAmount = _.sum(tasks, taskAmountForId(target.id));
            return (target.energyCapacity - target.energy - pendingAmount) > 0;
          });
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

        // Find haulers that can pickup energy
        const canPickupCreeps = creeps.filter(creep => _.sum(creep.carry) === 0
          || amountAssignedTo(creep, 'pickup', tasks) === 0,
        );
        console.log('Creeps that can pickup', canPickupCreeps.map(c => c.name));
        for (let creep of canPickupCreeps) {
          // Find resources that need to be picked up
          const availableDroppedResources = droppedResources.filter(resource => {
            const pendingAmount = _.sum(tasks, taskAmountForId(resource.id));
            return (resource.amount - pendingAmount) > 0;
          });
          console.log();
          if (availableDroppedResources.length) {
            const lastPickupTargetIndex = _.findLastIndex(tasks, t => t.action === 'pickup' && t.name === creep.name);
            let lastPickupTarget;
            if (lastPickupTargetIndex !== -1) {
              lastPickupTarget = Game.getObjectById(tasks[lastPickupTargetIndex].id);
              if (!lastPickupTarget) {
                console.log('Not able to find last transfer target');
              }
            } else {
              // If there are no pending transfer targets, set self as target
              lastPickupTarget = creep;
            }
            let pickupAmount = amountAssignedTo(creep, 'pickup', tasks);
            console.log('availableDroppedResources:', availableDroppedResources, 'lastPickupTarget:', lastPickupTarget, 'pickupAmount:', pickupAmount);
            while(pickupAmount < (creep.carryCapacity - _.sum(creep.carry))) {
              // Find a nearby target
              const sortedResources = availableDroppedResources.sort((a, b) =>
                (b.amount / lastPickupTarget.pos.getRangeTo(b)) - (a.amount / lastPickupTarget.pos.getRangeTo(a)),
              )
              if (sortedResources.length) {
                const nextTarget = sortedResources[0];
                console.log('nextTarget:', nextTarget);
                const availabeToPickupForCreep = creep.carryCapacity - _.sum(creep.carry) - pickupAmount;
                const pendingAmountForResource = _.sum([...tasks, ...newResourceDrops], taskAmountForId(nextTarget.id));
                const availableAmountForResource = nextTarget.amount - pendingAmountForResource;
                const pickupAmountForResource = Math.min(availableAmountForResource, availabeToPickupForCreep);

                if (availableAmountForResource < availabeToPickupForCreep) {
                  // This dropoff will be full, so remove it from consideration
                  _.pull(availableDroppedResources, nextTarget);
                }
                newResourceDrops.push({
                  id: nextTarget.id,
                  name: creep.name,
                  amount: pickupAmountForResource,
                  action: 'pickup',
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

        // for (let dropoff of needsEnergy) {
        //
        //
        //   for (let pendingDelivery of pendingEnergyDeliveries) {
        //     const energyLocations = pendingEnergyPickupPositions.sort((a, b) => a.pos.getRangeTo(dropoff) - b.pos.getRangeTo(dropoff));
        //     let remaining = dropoff.energyCapacity - dropoff.energy;
        //     let index = 0;
        //     while(remaining > 0) {
        //       const target = energyLocations[index];
        //       if (!target) {
        //         break;
        //       }
        //       let amountInPickup = target.amount;
        //       if (remaining < amountInPickup) {
        //         pendingDelivery.id = target.id;
        //         // Create a new task for the remainder
        //         const remainingTask = {
        //           from: pendingDelivery.from,
        //           amount: amountInPickup - remaining,
        //           action: 'transfer',
        //           type: RESOURCE_ENERGY,
        //           room: room.name,
        //         };
        //         newDropoffTasks.push(remainingTask);
        //         // pendingEnergyDeliveries.push(remainingTask);
        //       } else if (remaining >= amountInPickup) {
        //         pendingDelivery.id = target.id;
        //         //
        //       }
        //       remaining - amountInPickup;
        //       if (index++ >= energyLocations.length) {
        //         break;
        //       }
        //     }
        //   }
        //   const matchingTasks = tasks.filter(t => t.id === dropoff.id)
        //   if (matchingTasks.length === 0) {
        //     newDropoffTasks.push({
        //       id: dropoff.id,
        //       amount: dropoff.energyCapacity - dropoff.energy,
        //       action: 'transfer',
        //       type: RESOURCE_ENERGY,
        //       room: room.name,
        //     });
        //   } else {
        //     const totalOnTask = _.sum(matchingTasks, task => task.name && task.amount || 0);
        //     const pendingTasks = matchingTasks.filter(task => !task.name);
        //
        //     if (totalOnTask > dropoff.energyCapacity && pendingTasks.length) {
        //       // Too much is pending
        //       console.log('too much is pending in energy');
        //       _.pull(tasks, ...pendingTasks);
        //     } else if (pendingTasks.length > 1) {
        //       // Something got unassigned, merge them together
        //       _.pull(tasks, ...pendingTasks);
        //       newDropoffTasks.push({
        //         id: dropoff.id,
        //         amount: dropoff.energyCapacity - totalOnTask,
        //         action: 'transfer',
        //         type: RESOURCE_ENERGY,
        //         room: room.name,
        //       });
        //     }
        //   }
        // }
        //
        // const pendingStorageDeliveries = tasks.filter(t => t.from && !t.id);
        // const pendingStoragePickupPositions = pendingStorageDeliveries.reduce((memo, t) => {
        //   const pickupTask = tasks.find(pt => pt.id === t.id);
        //   if (pickupTask) {
        //     const pickupTarget = Game.getObjectById(pickupTask.id);
        //     if (pickupTarget) {
        //       memo.push(pickupTarget);
        //     }
        //   }
        //   return memo;
        // }, []);
        //
        // for (let dropoff of needsStorage) {
        //   for (let pendingDelivery of pendingStoragePickupPositions) {
        //     const resourceLocation = pendingStoragePickupPositions.sort((a, b) => a.pos.getRangeTo(dropoff) - b.pos.getRangeTo(dropoff));
        //     let remaining = dropoff.energyCapacity - dropoff.energy;
        //     let index = 0;
        //     while(remaining > 0) {
        //       const target = resourceLocation[index];
        //       if (!target) {
        //         break;
        //       }
        //       let amountInPickup = target.amount;
        //       if (remaining < amountInPickup) {
        //         pendingDelivery.id = target.id;
        //         // Create a new task for the remainder
        //         const remainingTask = {
        //           from: pendingDelivery.from,
        //           amount: amountInPickup - remaining,
        //           action: 'transfer',
        //           type: target.resourceType,
        //           room: room.name,
        //         };
        //         newDropoffTasks.push(remainingTask);
        //         pendingEnergyDeliveries.push(remainingTask);
        //       } else if (remaining >= amountInPickup) {
        //         pendingDelivery.id = target.id;
        //         _.pull(pendingEnergyDeliveries, )
        //       }
        //       remaining - amountInPickup;
        //       if (index++ >= energyLocations.length) {
        //         break;
        //       }
        //     }
        //   }
        //   const matchingTasks = tasks.filter(t => t.id === dropoff.id)
        //   if (matchingTasks.length === 0) {
        //     newDropoffTasks.push({
        //       id: dropoff.id,
        //       amount: dropoff.storeCapacity - _.sum(dropoff.store),
        //       action: 'transfer',
        //       type: RESOURCE_ENERGY,
        //       room: room.name,
        //     });
        //   } else {
        //     const totalOnTask = _.sum(matchingTasks, task => task.name && task.amount || 0);
        //     const pendingTasks = matchingTasks.filter(task => !task.name);
        //
        //     if (totalOnTask > dropoff.energyCapacity && pendingTasks.length) {
        //       // Too much is pending
        //       _.pull(tasks, ...pendingTasks);
        //     } else if (pendingTasks.length > 1) {
        //       // Something got unassigned, merge them together
        //       _.pull(tasks, ...pendingTasks);
        //       newDropoffTasks.push({
        //         id: dropoff.id,
        //         amount: dropoff.energyCapacity - totalOnTask,
        //         action: 'transfer',
        //         type: RESOURCE_ENERGY,
        //         room: room.name,
        //       });
        //     }
        //   }
        // }

        tasks.push(...newResourceDrops, ...newDropoffTasks);
        const beforeRemoveLength = tasks.length;
        _.remove(tasks, task => !Game.getObjectById(task.id) || task.amount === 0);
        const removedTasks = beforeRemoveLength - tasks.length;
        const totalUnassigned = tasks.filter(task => !task.name);
        console.log('Total hauler tasks:', tasks.length, 'removed:', removedTasks, 'newResourceDrops:', newResourceDrops.length, 'newDropoffTasks:', newDropoffTasks.length, 'unassigned:', totalUnassigned.length);
      };
    }
  }),
  foo: profiler('Hauler UPDATE', function* haulerUpdate({
    selectors,
    actionCreators,
  }) {
    if (!lastNeeds || Game.time % 8 === 0) {
      lastNeeds = yield call(createNeeds, {
        selectors,
        actionCreators,
      });
    }
    const tasks = lastTasks;
    const creeps = yield select(selectors.alive);
    _.remove(tasks, task => !Game.getObjectById(task.id) || task.amount === 0);
    tasks.forEach(task => {
      if (task.name && !Game.creeps[task.name]) {
        console.log('This creep no longer exists to fulfill task')
        delete task.name;
      }
    });
    const creepsNeedingTasks =
      _.difference(creeps.map(c => c.name), tasks.map(t => t.name))
      .map(name => Game.creeps[name]);

    for (let creep of creepsNeedingTasks) {
      creep.memory.transfer = {};
      creep.memory.pickup = {};
    }
    // Fix memory
    // for (let creep of creeps) {
    //   if (!creep.tasks.length) {

    //   }
    // }

    // Assign creeps to tasks
    console.log('Creeps needing tasks:', _.difference(creeps.map(c => c.name), tasks.map(t => t.name)).map(name => Game.creeps[name]))
    for (let creep of creepsNeedingTasks) {
      const unfilledTasks = tasks.filter(task => !task.name && task.id);
      const tasksSortedByDistance = unfilledTasks.sort((a, b) => Game.getObjectById(a.id).pos.getRangeTo(creep) - Game.getObjectById(b.id).pos.getRangeTo(creep));
      for (let task of tasksSortedByDistance) {
        const target = Game.getObjectById(task.id);
        if (target) {
          if (creep.carry[task.type] > 0 && task.action === 'transfer' && !task.name) {
            const carryAmount = _.sum(creep.carry) - _.sum(creep.memory.transfer);
            if (carryAmount > 0) {
              console.log('has it', creep.carry[task.type], _.sum(creep.memory.transfer), 'carryAmount:', carryAmount)
              // console.log('in transfer', 'creep:', creep.carry[task.type], 'transfer:', _.get(creep.memory, `transfer.${task.type}`));
              const transferAmount = Math.min(carryAmount, task.amount);
              console.log(`assigning ${transferAmount} to ${creep.name} before: ${creep.memory.transfer[task.type] || 0} after ${(creep.memory.transfer[task.type] || 0) + transferAmount} for ${task.id}`)
              creep.memory.transfer[task.type] = creep.memory.transfer[task.type] || 0;
              creep.memory.transfer[task.type] += transferAmount;
              console.log('can add remainder task for transfer?', 'creep:', creep.carry[task.type], '<', 'task:', task.amount, !unfilledTasks.find(t => t !== task && t.id === task.id))
              if (creep.carry[task.type] < task.amount && !unfilledTasks.find(t => t !== task && t.id === task.id)) {
                const amount = _.sum(tasks, t => {
                  if (t.id === task.id) {
                    return t.amount;
                  }
                  return 0;
                }) - transferAmount;
                console.log('add remainder task for transfer', amount);
                tasks.push({
                  ...task,
                  amount,
                });
              }
              task.name = creep.name;
              task.amount = transferAmount;
              _.pull(creepsNeedingTasks, creep);
              _.pull(unfilledTasks, task);
            }
          } else if ((creep.carryCapacity - _.sum(creep.carry)) > 0 && task.action === 'pickup' && !task.name) {
            const carryLeft = creep.carryCapacity - _.sum(creep.carry) - _.sum(creep.memory.pickup);
            if (carryLeft > 0) {
              console.log(creep.name, 'needs it', creep.carry[task.type], _.sum(creep.carry), 'carryLeft:', carryLeft)
              // console.log('can add remainder task for pickup?', 'target:', target.amount, '> task:', task.amount, !unfilledTasks.find(t => t !== task && t.id === task.id))
              const pickupAmount = Math.min(carryLeft, task.amount);
              console.log(`assigning ${pickupAmount} to ${creep.name} before: ${creep.memory.pickup[task.type] || 0} after ${(creep.memory.pickup[task.type] || 0) + pickupAmount} for ${task.id}`)
              creep.memory.pickup[task.type] = creep.memory.pickup[task.type] || 0;
              creep.memory.pickup[task.type] += pickupAmount;
              if (target.amount > carryLeft && !unfilledTasks.find(t => t !== task && t.id === task.id)) {
                const amount = _.sum(tasks, t => {
                  if (t.id === task.id) {
                    return t.amount;
                  }
                  return 0;
                }) - pickupAmount;
                console.log('adding remainder task for pickup', amount);
                // make a new task for the remaining
                tasks.push({
                  ...task,
                  amount,
                  name: null,
                });
              }
              task.name = creep.name;
              task.amount = pickupAmount;
              _.pull(creepsNeedingTasks, creep);
              _.pull(unfilledTasks, task);
            }
          }
        }
      }
    }
    console.log('Creeps still needing tasks:', _.difference(creeps.map(c => c.name), tasks.map(t => t.name)).map(name => Game.creeps[name]))
    // for (let task of unfilledTasks) {
    //   const target = Game.getObjectById(task.id);
    //   if (target) {
    //     const creepsSortedByDistance = creepsNeedingTasks.sort((a, b) => a.pos.getRangeTo(target) - b.pos.getRangeTo(target));
    //     for (let creep of creepsSortedByDistance) {
    //
    //     }
    //   }
    // }
    // console.log(creeps.map(c => `${c.name} pickup:${c.memory.pickup.energy ? c.memory.pickup.energy : 0} transfer:${c.memory.transfer.energy ? c.memory.transfer.energy : 0} ${JSON.stringify(c.memory.tasks.map(task => ({
    //   id: task.id,
    //   amount: task.amount,
    //   action: task.action,
    // })))}`).join('\n'))
    console.log('At end of UPDATE there are', tasks.filter(t => t.name).length, 'assigned tasks');
    lastTasks = tasks;


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
      const task = myTasks[0];
      console.log(`${creep.name} has ${myTasks.length} to do`)
      if (task) {
        const target = Game.getObjectById(task.id);
        if (target) {
          const range = creep.pos.getRangeTo(target);
          if (task.action === 'pickup') {
            if (range > 1) {
              creep.routeTo(target, { range: 1 });
            } else {
              const creepAmount = creep.carryCapacity - creep.carry[task.type];
              const pickupAmount = Math.min(creepAmount, target.amount);
              creep.say('pickup');
              const pickupErr = creep.pickup(target, pickupAmount, task.type);
              if (!pickupErr) {
                const deliverTask = tasks.find(t => t.from === task.id);
                if (deliverTask) {
                  deliverTask.name === creep.name;
                }
              }
              if (pickupErr) {
                console.log('pickup error', pickupErr);
              }
              _.pull(tasks, task);
              creep.memory.pickup[task.type] = Math.max(creep.memory.pickup[task.type] - task.amount, 0);
              console.log(`${creep.name} pickup task:${task.amount} targetAmount:${target.amount} creep:(${_.sum(creep.carry)}/${creep.carryCapacity}) pickup:${_.sum(creep.memory.pickup)}`);
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
              let moved = false;
              for (let i = 1; i < myTasks.length; i++) {
                if (creepAmount <= 0) {
                  break;
                }
                const futureTask = myTasks[i];
                const futureTarget = Game.getObjectById(futureTask.id);
                if (futureTarget) {
                  if (futureTarget.pos.getRangeTo(creep) <= 1) {
                    if ('energy' in target) {
                      targetAmount = target.energyCapacity - target.energy;
                    } else if (target.store && target.store[task.type]) {
                      targetAmount = target.storeCapacity - _.sum(target.store);
                    } else {
                      console.log('what is', target);
                    }
                    const futureTransferAmount = Math.min(creepAmount, targetAmount);
                    if (futureTransferAmount > 0) {
                      const transferErr = creep.transfer(futureTask, futureTask.type, Math.min(creepAmount, futureTransferAmount));
                      if (transferErr) {
                        console.log('transfer error', transferErr);
                      } else {
                        creepAmount -= futureTransferAmount;
                      }
                    }
                  } else if (!moved) {
                    creep.routeTo(futureTarget, { range: 1 });
                    moved = true;
                  }
                }
              }
              console.log(`${creep.name} transfer target:${target} task:${task.amount} targetAmount:${targetAmount} creep:(${_.sum(creep.carry)}/${creep.carryCapacity}) transfer:${_.sum(creep.memory.transfer)}`);
            }
            continue;
          }
        } else {
          console.log(`Object ${task.id} no longer exists`);
          _.pull(tasks, task);
        }
      }
    }
    // const tasks = lastTasks;
    // const creeps = yield select(selectors.alive);
    // console.log('HAULER RUN start');
    // // console.log(creeps.map(c => `${c.name} pickup:${c.memory.pickup.energy ? c.memory.pickup.energy : 0} transfer:${c.memory.transfer.energy ? c.memory.transfer.energy : 0} ${c.memory.tasks.map(task => ({
    // //   id: task.id,
    // //   amount: task.amount,
    // //   action: task.action,
    // // })))}`).join('\n'))
    // console.log('At begining of RUN there are', tasks.filter(t => t.name).length, 'assigned tasks');
    //
    // console.log('HAULER RUN end');
    // for (let task of tasks) {
    //   if (task.name) {
    //     const creep = Game.creeps[task.name];
    //
    //   }
    // }
  }),
});
