function createMatcher({
  matcher,
  describe,
}) {
  const m = creep => matcher(creep);
  m.describe = creep => describe(creep, matcher);
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

export function isMine() {
  return createMatcher({
    matcher(target) {
      return target.my === true;
    },
    describe(target) {
      return `isMine === ${target.my}`;
    },
  });
}

export const logic = {
  and,
  not,
  eq,
};

export const creep = {
  full: hasCarryCapacityRemaining(eq(0)),
  notFull: not(hasCarryCapacityRemaining(eq(0))),
};

export const target = {
  isSpawn: isStructureOfType(STRUCTURE_SPAWN),
  isContainer: isStructureOfType(STRUCTURE_CONTAINER),
  isMyContainer: and(isStructureOfType(STRUCTURE_CONTAINER), isMine()),
};

const commands = {
  logic,
  creep,
  target,
}

export default function evaluate(command) {
  return _.get(commands, command);
}
