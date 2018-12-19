
export function renewSelf(creep, minTicks = 1400) {
  const target = Game.spawns['Spawn1'];
  const range = creep.pos.getRangeTo(target);
  if (target && range > 1) {
    //creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
    creep.routeTo(target, { range:0, ignoreCreeps:false });
  } else {
    if (target && !target.spawning) {
      const err = target.renewCreep(creep);
      if (err) {
        creep.say(err);
        console.log(creep.name, "error renewing creep", err);
        creep.memory.task = "fill";
      }
      if (creep.ticksToLive > minTicks || creep.room.energyAvailable < 200) {
        creep.say("all better", true);
        creep.memory.task = "fill";
      }
    }
  }
}

export function vanish(creep) {
  let target;
  if (!creep.memory.targetId) {
    const targets = creep.room.find(FIND_STRUCTURES, {
      filter(structure){
        return structure.structureType === STRUCTURE_EXTENSION;
      }
    })
    //target = _.sample(targets);
    //console.log("setting target by position");
    if (targets.length) {
      target = creep.pos.findClosestByRange(targets);
      //const sourceNum = targets.indexOf(target);
      creep.say("vanish", true);
      creep.memory.targetId = target.id;
    }
  } else {
    //console.log("getting target from memory");
    target = Game.getObjectById(creep.memory.targetId);
  }
  return target;
}

export function wakeup(creep) {
  if (creep.memory.targetId) {
    delete creep.memory.targetId;
    creep.say("bzzt", true);
  }
}

//export function getEnergy()
