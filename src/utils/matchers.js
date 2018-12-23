function createMatcher({
  matcher,
  describe,
}) {
  const m = creep => matcher(creep);
  m.describe = creep => {
    if (!_.isFunction(describe)) {
      return m.toString();
    }
    return describe(creep, matcher);
  }
  return m;
}

export function and(...matchers) {
  return createMatcher({
    matcher(value) {
      return matchers.every(m => m(value));
    },
    describe(value) {
      return `(${matchers.map(m => m.describe(value)).join(' AND ')})`
    },
  });
}

export function or(...matchers) {
  return createMatcher({
    matcher(value) {
      return matchers.some(m => m(value));
    },
    describe(value) {
      return `(${matchers.map(m => m.describe(value)).join(' OR ')})`
    },
  });
}

export function not(matcher) {
  return createMatcher({
    matcher(value) {
      return !matcher(value);
    },
    describe(value) {
      return `!(${matcher.describe(value)})`
    },
  });
}

export function eq(source) {
  return createMatcher({
    matcher(value) {
      return source === value;
    },
    describe(value) {
      return `${source} === ${value}`
    },
  });
}

export function hasCarryCapacityRemaining(matcher) {
  return createMatcher({
    matcher(creep) {
      return matcher(evalCreep(creep.carryCapacity - _.sum(creep.carry)))
    },
    describe(creep) {
      return `hasCarryCapacityRemaining(${matcher.describe(creep)})`;
    },
  });
}

export function isStructureOfType(type) {
  return createMatcher({
    matcher(target) {
      return target.structureType === type;
    },
    describe(target) {
      return `isStructureOfType(${type}) === ${target.structureType}`;
    },
  });
}

export const isMine = createMatcher({
  matcher(target) {
    return target.my === true;
  },
  describe(target) {
    return `isMine === ${target.my}`;
  },
})

export const needsEnergy = createMatcher({
  matcher(target) {
    if (_.isNumber(target.energy)) {
      return target.energy < target.energyCapacity;
    }
    return _.sum(target.store) < target.storeCapacity;
  },
  describe(target, m) {
    return `needsEnergy(${target}) === ${m(target)}`;
  }
});

export const logic = {
  and,
  not,
  eq,
  or,
};

// STRUCTURE_SPAWN: "spawn",
// STRUCTURE_EXTENSION: "extension",
// STRUCTURE_ROAD: "road",
// STRUCTURE_WALL: "constructedWall",
// STRUCTURE_RAMPART: "rampart",
// STRUCTURE_KEEPER_LAIR: "keeperLair",
// STRUCTURE_PORTAL: "portal",
// STRUCTURE_CONTROLLER: "controller",
// STRUCTURE_LINK: "link",
// STRUCTURE_STORAGE: "storage",
// STRUCTURE_TOWER: "tower",
// STRUCTURE_OBSERVER: "observer",
// STRUCTURE_POWER_BANK: "powerBank",
// STRUCTURE_POWER_SPAWN: "powerSpawn",
// STRUCTURE_EXTRACTOR: "extractor",
// STRUCTURE_LAB: "lab",
// STRUCTURE_TERMINAL: "terminal",
// STRUCTURE_CONTAINER: "container",
// STRUCTURE_NUKER: "nuker",

export const creep = {
  full: hasCarryCapacityRemaining(eq(0)),
  notFull: not(hasCarryCapacityRemaining(eq(0))),
};

export const target = {
  isSpawnSupply: or(
    isStructureOfType(STRUCTURE_SPAWN),
    isStructureOfType(STRUCTURE_EXTENSION)
  ),
  needsEnergy,
  isMine,
  isSpawn: isStructureOfType(STRUCTURE_SPAWN),
  isImpassable: or(
    isStructureOfType(STRUCTURE_TOWER),
    isStructureOfType(STRUCTURE_TERMINAL),
    isStructureOfType(STRUCTURE_NUKER),
    isStructureOfType(STRUCTURE_OBSERVER),
    isStructureOfType(STRUCTURE_POWER_SPAWN),
    isStructureOfType(STRUCTURE_PORTAL),
    isStructureOfType(STRUCTURE_POWER_BANK),
    isStructureOfType(STRUCTURE_LAB),
    isStructureOfType(STRUCTURE_WALL),
    isStructureOfType(STRUCTURE_STORAGE),
    isStructureOfType(STRUCTURE_EXTENSION),
    isStructureOfType(STRUCTURE_SPAWN),
  ),
  isMySpawn: and(isStructureOfType(STRUCTURE_SPAWN), isMine),
  isExtension: isStructureOfType(STRUCTURE_EXTENSION),
  isContainer: isStructureOfType(STRUCTURE_CONTAINER),
  isMyContainer: and(isStructureOfType(STRUCTURE_CONTAINER), isMine),
};

const commands = {
  logic,
  creep,
  target,
}

export default function evaluate(command) {
  return _.get(commands, command);
}
