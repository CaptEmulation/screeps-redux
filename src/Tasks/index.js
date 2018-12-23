
export function renewSelf(creep, task='fill') {
  let target;

  const targets = creep.room.find(FIND_MY_STRUCTURES, {
    filter(structure) {
      return structure.structureType === STRUCTURE_SPAWN;
    }
  });
  if (targets.length) {
    target = creep.pos.findClosestByRange(targets);
  }
  if (!target) {
    target = Game.spawns['Spawn1'];
  }
  const range = creep.pos.getRangeTo(target);
  if (creep.memory.dieoff === true) {
    creep.memory.task = task;
  }
  if (target && range > 1) {
    //creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
    creep.routeTo(target, { range:0, ignoreCreeps:false });
    const saying = Math.random() * 4;
    if (Math.floor(saying) === 1) {
      creep.say("help me!", true);
    }
    else if (Math.floor(saying) === 2) {
      creep.say("fix me!", true);
    }
  } else {
    if (target && !target.spawning) {
      //console.log("Renew creep", creep, creep.ticksToLive, creep.body.length, 1500 - Math.floor(600/creep.body.length));
      if (creep.ticksToLive > (1500 - Math.floor(600/creep.body.length)) || creep.room.energyAvailable < 200) {
        creep.say("all better", true);
        //console.log(creep.name, "renewed creep to", creep.ticksToLive);
        creep.memory.task = task;
      } else {
        const err = target.renewCreep(creep);
        if (err) {
          creep.say(err);
          console.log(creep.name, "error renewing creep", err);
          if (err === -8) {
            console.log(creep.name, "renewed creep to", creep.ticksToLive);
            creep.memory.task = task;
          }
        }
      }
    }
  }
}

export function returnSelf(creep, task) {
  let target

  const targets = creep.room.find(FIND_MY_STRUCTURES, {
    filter(structure) {
      return structure.structureType === STRUCTURE_SPAWN;
    }
  });
  if (targets.length) {
    target = creep.pos.findClosestByRange(targets);
  }
  if (!target) {
    target = Game.spawns['Spawn1'];
  }

  const range = creep.pos.getRangeTo(target);
  if (target && range > 1) {
    //creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
    creep.routeTo(target, { range:0, ignoreCreeps:false });
  } else {
    let err = target.recycleCreep(creep);
    if (err) {
      console.log("Error recycling creep", creep.name, err);
    } else {
      console.log("Recycled creep", creep.name);
    }
  }
}

export function vanish(creep) {
  let target;
  if (!creep.memory.targetId) {
    creep.say("vanish", true);
    let targets = creep.room.find(FIND_STRUCTURES, {
      filter(structure){
        return structure.structureType === STRUCTURE_EXTENSION;
      }
    })
    if (!targets.length) {
      targets = creep.room.find(FIND_FLAGS);
    }
    //target = _.sample(targets);
    //console.log("setting target by position");
    if (targets.length) {
      target = creep.pos.findClosestByRange(targets);
      //const sourceNum = targets.indexOf(target);
      //console.log(creep.name, "targetId", target.id);
      //creep.memory.targetId = target.id;
    }
  } else {
    //console.log("getting target from memory");
    target = Game.getObjectById(creep.memory.targetId);
  }
  //console.log(target);
  return target;
}

export function wakeup(creep) {
  if (creep => memory && creep.memory.targetId) {
    delete creep.memory.targetId;
    creep.say("bzzt", true);
  }
}

//export function getEnergy()
