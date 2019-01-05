function notDrainersOrDrainersNeedingHealing(creep) {
  // Change to task search when we have a drainer....
  const isDrainer = creep.memory && creep.memory.role === 'Drainer';
  const isDamaged = creep.hits < creep.hitsMax;
  const notDrainerWithDamage = !isDrainer && isDamaged;
  const workingHealPieces = !!creep.body.find(b => b.type === HEAL && b.hits > 0);
  const drainerThatCannotHeal = isDrainer
    && isDamaged
    && !workingHealPieces;
  return notDrainerWithDamage || drainerThatCannotHeal;
}


export default function* towerDefense(room, {
  priority,
  sleep,
  done,
  context,
}) {
  const hostiles = room.find(FIND_HOSTILE_CREEPS);
  if (hostiles.length === 0) {
    yield priority();
    yield done();
  }
  yield priority(-(hostiles.length * 10));
  const towers = room.find(FIND_STRUCTURES, {
    filter: (target) => target.structureType === STRUCTURE_TOWER,
  });
  const friendliesNeedingHealing = room.find(FIND_MY_CREEPS, {
    filter: notDrainersOrDrainersNeedingHealing,
  }).sort((a, b) => (a.hitsMax - a.hits) - (b.hitsMax - b.hits));
  if (friendliesNeedingHealing.length) {
    const {
      hits,
      hitsMax,
    } = friendliesNeedingHealing[0];
    // towers.forEach(tower => {
    //   tower.heal(friendliesNeedingHealing[0]);
    // });
  }
  towers.forEach(tower => {
    tower.attack(tower.pos.findClosestByRange(hostiles));
  });
  const lowRamparts = room.find(FIND_STRUCTURES, {
    filter(rampart) {
      return rampart.structureType === STRUCTURE_RAMPART && rampart.hits < 1000;
    }
  });
  if (lowRamparts) {
    towers.forEach(tower => {
      tower.repair(lowRamparts[0]);
    });
  }

  yield done();
}
