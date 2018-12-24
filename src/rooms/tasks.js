import {
  not,
  hasTask,
} from '../utils/matchers';
import {
  bunkerLayout,
} from './layout';

export function* bootstrap(room, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (!context.scanned) {
    context.scanned = true;
    yield subTask(scan);
  }
  if (room.controller && room.controller.my) {
    switch (room.controller.level) {
      case 1:
        yield subTask(rcl1);
        break;
      case 2:
        yield subTask(rcl2);
        break;
      case 3:
        yield subTask(rcl3);
        break;
    }
  }
}

export function* scan(room, {
  priority,
}) {
  yield priority(10);
  if (_.isUndefined(room.memory.sk)) {
    // Look for hostile structures to avoid
    const sks = room.find(FIND_HOSTILE_STRUCTURES, {
      filter(structure) {
        return structure.structureType === 'keeperLair';
      }
    })
    room.memory.sk = sks.map(sk => ({
      id: sk.id,
    }));
  }
  if (room.controller && room.controller.my) {

  }
}

function bootstrapWithNoCreeps(room) {
  const spawns = room.find(FIND_MY_SPAWNS);
  const spawnsWithoutBootstrap = spawns.filter(not(hasTask('bootstrap')));
  if (spawnsWithoutBootstrap.length) {
    const myCreepsInRoom = room.find(FIND_MY_CREEPS);
    const hostileCreepsInRoom = room.find(FIND_HOSTILE_CREEPS);
    // Make this better...
    if (myCreepsInRoom.length === 0 && hostileCreepsInRoom.length === 0) {
      spawnsWithoutBootstrap.forEach(spawn => spawn.addTask('bootstrap'));
      return true;
    }
  }
  return false;
}

export function* rcl1(room, {
  priority,
  subTask,
  context,
  done,
}) {
  yield priority();
  if (room.controller && (room.controller.my && room.controller.level !== 1) || !room.controller.my) {
    yield done();
  }
  if (_.isUndefined(room.memory.sources)) {
    // Look for safe sources
    const sks = room.memory.sk.map(a => Game.getObjectById(a.id));
    const sources = room.find(FIND_SOURCES, {
      filter(source) {
        return !sks.find(sk => sk.pos.getRangeTo(source) < 9);
      },
    });
    room.memory.sources = sources.map(source => ({
      id: source.id,
    }));
  }
  bootstrapWithNoCreeps(room);

}

export function* rcl2(room, {
  priority,
  subTask,
  context,
  done,
}) {
  yield priority();
  if (room.controller && (room.controller.my && room.controller.level !== 1) || !room.controller.my) {
    yield done();
  }

}
