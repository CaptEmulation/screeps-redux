export function findWorkSites(room) {
  return findPreferredConstructionTarget(room);
}

const PREFERRED_STRUCTURE_ORDER = [
  STRUCTURE_SPAWN,
  STRUCTURE_TOWER,
  STRUCTURE_CONTAINER,
  STRUCTURE_EXTENSION,
];

export function findPreferredConstructionTarget(room, preferred = PREFERRED_STRUCTURE_ORDER) {
  const targets = room.find(FIND_CONSTRUCTION_SITES);
  let preferredTarget = null;
  for (let i = 0; i < preferred.length; i++) {
    const preferredStruture = preferred[i];
    const priorityList = targets.filter(r => {
      const result = r.structureType === preferredStruture;
      return result;
    }).sort((a, b) => (a.progressTotal - a.progress) - (b.progressTotal - b.progress));
    if (priorityList.length) {
      preferredTarget = priorityList[0];
      break;
    }
  }
  if (!preferredTarget && targets.length) {
    return targets[0];
  }
  return preferredTarget;
}
