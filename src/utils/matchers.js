function createMatcher({
  matcher,
  describe,
}) {
  const m = creep => matcher(creep);
  m.describe = creep => describe(creep, matcher);
  return m;
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

export const logic = {
  not,
  eq,
};

export const creep = {
  full: hasCarryCapacityRemaining(eq(0)),
  notFull: not(hasCarryCapacityRemaining(eq(0))),
};

const commands = {
  logic,
  creep,
}

export default function evaluate(command) {
  return _.get(commands, command);
}
