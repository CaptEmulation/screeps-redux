import pickup from './pickup';
import {
  and,
  or,
  target as targetMatchers,
} from '../../utils/matchers';

export default function* queen(creep, {
  priority,
  subTask,
  context,
  sleep,
}) {
  yield priority();
  if (context.room && context.room !== _.get(creep, 'room.name')) {
    return creep.routeTo(new RoomPosition(24, 24, context.room));
  } else if (context.room) {
    if (context.supply) {
      context.supplyReturn = context.home;
    } else if (context.pickup) {
      context.pickupReturn = context.home;
    }
    delete context.room;
  }
  let supplyAvailable;
  if (_.sum(creep.carry) > 0) {
    if (context.pickupReturn && context.pickupReturn !== _.get(creep, 'room.name')) {
      return creep.routeTo(new RoomPosition(24, 24, context.pickupReturn));
    } else {
      delete context.pickupReturn;
    }
    if (context.supply) {
      let target;
      const roomNeedingSupply = context.supply.find(roomName => {
        if (roomName === creep.room.name) {
          return false;
        }
        if (Game.rooms[roomName]) {
          const room = Game.rooms[roomName];
          const stores = room.find(FIND_STRUCTURES, {
            filter: and(
              or(
                targetMatchers.isStorage,
                targetMatchers.isContainer,
              ),
              s => s.store[RESOURCE_ENERGY] < 1000,
            ),
          });
          if (stores.length) {
            return true;
          }
        }
      });
      if (roomNeedingSupply) {
        context.room = roomNeedingSupply;
        return yield sleep();
      }
    }
    for (let action of ['supplyTower', 'supplySpawn', 'supplyBunker', 'supplyUpgrade', 'supplyBunkerStorage']) {
      const result = yield subTask(action);
      if (result.noTarget) {
        continue;
      }
      supplyAvailable = true;
      break;
    }
  }
  if (!supplyAvailable) {
    if (context.supplyReturn && context.supplyReturn !== _.get(creep, 'room.name')) {
      return creep.routeTo(new RoomPosition(24, 24, context.supplyReturn));
    } else {
      delete context.supplyReturn;
    }
    if (context.pickup) {
      let target;
      const roomNeedingPickup = context.pickup.find(roomName => {
        if (roomName === creep.room.name) {
          return false;
        }
        if (Game.rooms[roomName]) {
          return true;
        }
      });
      if (roomNeedingPickup) {
        context.room = roomNeedingPickup;
        return yield sleep();
      }
    }
    return yield subTask(pickup);
  }
}
