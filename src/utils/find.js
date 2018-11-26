export function findWorkSites(room) {
  return findPreferredConstructionTarget(room);
}

export function findEnergySinks(room) {
  return findPreferredConstructionTarget(room);
}

const PREFERRED_STRUCTURE_ORDER = [
  STRUCTURE_SPAWN,
  STRUCTURE_EXTENSION,
  STRUCTURE_CONTAINER,
];

export function findPreferredConstructionTarget(room, preferred = PREFERRED_STRUCTURE_ORDER) {
  const targets = room.find(FIND_CONSTRUCTION_SITES);
  let preferredTarget = null;
  for (let i = 0; i < preferred.length; i++) {
    const preferredStruture = preferred[i];
    const lowPriority = [];
    const priorityList = targets.filter(r => {
      const result = r.structureType === preferredStruture;
      if (!result){
        lowPriority.push(r);
      }
      return result;
    }).sort((a, b) => (a.progress) - (b.progress)).concat(lowPriority);
    if (priorityList.length) {
      preferredTarget = priorityList[0];
      break;
    }
  }
  return preferredTarget;
}
