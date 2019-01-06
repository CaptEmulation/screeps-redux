import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  and,
  or,
  hasTask,
  target as targetMatchers,
} from '../../utils/matchers';

const reserverBody = [CLAIM, MOVE];
function reserverMemory({ homeRoom, targetRoom, target }) {
  return {
    memory: {
      tasks: [{
        action: 'reserver',
        target,
        home: homeRoom,
        mine: targetRoom,
      }, {
        action: 'sign',
        msg: 'screeps-redux',
      }],
    }
  };
}

const dropMinerBodySmall = [MOVE, CARRY, WORK, WORK];
const dropMinerBodyLarge = [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
function dropMinerBody(room) {
  let body;
  if (calcCreepCost(dropMinerBodyLarge) <= room.energyAvailable) {
    body = dropMinerBodyLarge;
  } else {
    body = dropMinerBodySmall;
  }
  return body;
}
function dropMinerMemory({ homeRoom, targetRoom }) {
  return {
    memory: {
      tasks: [{
        action: 'dropMiner',
        room: targetRoom,
        home: homeRoom,
      }],
    }
  };
}

const queenBuilds = [
  [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
];
function queenMemory({ targetRoom, homeRoom }) {
  return {
    memory: {
      tasks: [{
        action: 'queen',
        home: homeRoom,
        pickup: [targetRoom],
      }],
    }
  };
}

const CREEPS_PRIORITY = ['scout', 'reserver', 'dropMiner', 'queen'];

export default function* remoteMine(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  const allCreeps = Object.values(Game.creeps);
  const { rooms } = context;

  let creepsNeeded = [];
  if (!context.needs || Game.time % 10 === 0) {
    const myCreeps = allCreeps.filter(
      or(
        hasTask('reserver', task => task.home === spawn.room.name && rooms.includes(task.mine)),
        hasTask('dropMiner', task => task.home === spawn.room.name && rooms.includes(task.room)),
        hasTask('queen', task => task.home === spawn.room.name && _.intersection(rooms, task.pickup).length),
      ),
    );
    for(let room of rooms) {
      if (!Memory.rooms[room] || !Memory.rooms[room].sources) {
        // Room neeeds a scan
        const activeScoutCreeps = allCreeps.filter(hasTask('scout', task => task.target === room));
        console.log(activeScoutCreeps);
        if (!activeScoutCreeps.length) {
          creepsNeeded.push({
            room,
            creep: 'scout',
          });
        }
        continue;
      }
      if (!Memory.rooms[room].controller) {
        continue;
      }
      const controllerTarget = [...Memory.rooms[room].controller.pos, room];
      const sources = Memory.rooms[room].sources;
      const reserverCreeps = myCreeps.filter(
        and(
          hasTask('reserver', task => task.mine === room),
          creep => creep.ticksToLive > 100,
        ),
      );
      if (!reserverCreeps.length) {
        creepsNeeded.push({
          room,
          creep: 'reserver',
          target: controllerTarget,
        });
      }
      const dropMinerCreeps = myCreeps.filter(
        and(
          hasTask('dropMiner', task => task.room === room),
          creep => creep.ticksToLive > 100,
        ),
      );
      const dropMinerCreepParts = _.sum(
        dropMinerCreeps,
        creep => creep.body.filter(b => b.type === WORK).length,
      );
      const neededWorkParts = sources.length * 5;
      if (dropMinerCreepParts < neededWorkParts) {
        creepsNeeded.push({
          room,
          creep: 'dropMiner',
        });
      }
      const queenCreeps = myCreeps.filter(
        hasTask('queen', task => task.pickup.includes(room))
      );
      if (queenCreeps.length < (sources.length + 1)) {
        creepsNeeded.push({
          room,
          creep: 'queen',
        });
      }
    }
    creepsNeeded = creepsNeeded.sort((a, b) => CREEPS_PRIORITY[a.creep] - CREEPS_PRIORITY[b.creep]);
    context.needs = creepsNeeded;
  } else {
    creepsNeeded = context.needs;
  }

  if (creepsNeeded.length && !spawn.spawning) {
    yield priority(context.priority);
  } else {
    yield sleep();
  }

  const nextCreepDef = _.first(creepsNeeded);
  let nextCreep;
  switch(nextCreepDef.creep) {
    case 'scout': {
      nextCreep = [
        [MOVE],
        `Scout ${sillyname()}`,
        {
          memory: {
            tasks: [{
              action: 'scout',
              target: nextCreepDef.room,
            }],
          },
        },
      ];
      break;
    }
    case 'reserver': {
      nextCreep = [reserverBody, `Reserver ${sillyname()}`, reserverMemory({
        homeRoom: spawn.room.name,
        targetRoom: nextCreepDef.room,
        target: nextCreepDef.target,
      })];
      break;
    }
    case 'dropMiner': {
      nextCreep = [dropMinerBody(spawn.room), `${sillyname()} the Remote Miner`, dropMinerMemory({
        homeRoom: spawn.room.name,
        targetRoom: nextCreepDef.room,
      })];
      break;
    }
    case 'queen': {
      let level = spawn.room.controller.level - 1;
      while (calcCreepCost(queenBuilds[level]) > spawn.room.energyAvailable) {
        if (level === 0) {
          break;
        }
        level -= 1;
      }
      nextCreep = [queenBuilds[level], `Remote Queen ${sillyname()}`, queenMemory({
        homeRoom: spawn.room.name,
        targetRoom: nextCreepDef.room,
      })];
      break;
    }
    default:
      throw new Error(`Creep ${nextCreepDef.creep} not defined`);
  }
  if (!nextCreep) {
    yield sleep();
  }
  const err = spawn.spawnCreep(...nextCreep);
  if (!err) {
    context.needs.shift();
  }
}
