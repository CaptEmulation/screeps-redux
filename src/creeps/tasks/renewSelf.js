import {
  target as targetMatchers,
} from '../../utils/matchers';

export default function* renewSelf(creep, {
  done,
  priority,
  sleep,
  context,
}) {
  if (!context.spawnId) {
    const targets = creep.room.find(FIND_STRUCTURES, {
      filter: targetMatchers.isSpawn,
    });
    if (targets.length) {
      context.spawnId = creep.pos.findClosestByRange(targets).id;
    }
  }
  const target = Game.getObjectById(context.spawnId);
  if (!target || target.room.energyAvailable < 50) {
    // Can't find a spawn to renew at
    delete context.isRenewing;
    delete creep.memory.target;
    yield sleep();
  } else if (context.isRenewing) {
    // Hold priority while renewing
    yield priority(context.isRenewing);
  } else {
    // priority goes up as tick gets closer to death
    yield priority(-200 + creep.ticksToLive);
  }
  context.isRenewing = context.isRenewing || -200 + creep.ticksToLive;
  if (creep.ticksToLive > 1300) {
    delete context.isRenewing;
    delete creep.memory.target;
    yield done();
  }


  const range = creep.pos.getRangeTo(target);
  if (range > 1) {
    creep.routeTo(target, { range: 1 });
  } else {
    creep.memory.target = target.id;
    target.renewCreep(creep);
  }
}
