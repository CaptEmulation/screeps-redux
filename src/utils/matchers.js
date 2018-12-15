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

export function matchProp(prop, matcher) {
  return createMatcher({
    matcher(value) {
      return matcher(_.get(value, prop));
    },
    descrive(value, m) {
      const p = m(value);
      return `matchProp(${prop}) with ${matcher.describe(p, matcher(p))}`;
    },
  });
}

export function isInstanceOf(type) {
  return createMatcher({
    matcher(value) {
      return value instanceof type;
    },
    describe(value) {
      return `${value} instanceof ${type}`;
    },
  });
}

export function withGameObject(matcher) {
  return createMatcher({
    matcher(id) {
      return matcher(Game.getObjectById(id));
    },
    describe(id, m) {
      return `withGameObject(${id}) with ${m(id)}`;
    },
  })
}

export function isTaskTargetingInstanceOf(instance) {
  return matchProp('target', withGameObject(isInstanceOf(instance)));
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
});

export function isTaskAction(action) {
  return createMatcher({
    matcher({ action }) {
      return task.action === action;
    },
    describe(task) {
      return `isTaskAction(${action}) === ${task.action}`;
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
  isMyContainer: and(isStructureOfType(STRUCTURE_CONTAINER), isMine),
};

const isEnergyHarvestingTask = and(
  matchProp('action', eq('harvest')),
  matchProp('target', withGameObject(isInstanceOf(Source)))
);

const isEnergyDeliveryTask = and(
  matchProp('action', eq('transfer')),
  matchProp('type', eq(RESOURCE_ENERGY)),
  matchProp('target', or(
     withGameObject(isInstanceOf(StructureContainer)),
     withGameObject(isInstanceOf(StructureStorage)),
     withGameObject(isInstanceOf(StructureTower)),
  )),
);

const isPickupTask = and(
  matchProp('action', eq('pickup')),
  matchProp('target', or(
     withGameObject(isInstanceOf(Resource)),
  )),
);

const isEnergyAcquireTask = or(
  and(
    matchProp('action', eq('pickup')),
    matchProp('type', eq(RESOURCE_ENERGY)),
    matchProp('target', withGameObject(isInstanceOf(Resource))),
  ),
  and(
    matchProp('action', eq('withdraw')),
    matchProp('type', eq(RESOURCE_ENERGY)),
    matchProp('for', withGameObject(isInstanceOf(Source))),
    matchProp('target', withGameObject(isInstanceOf(StructureContainer))),
  ),
  and(
    matchProp('action', eq('withdraw')),
    matchProp('type', eq(RESOURCE_ENERGY)),
    matchProp('target', withGameObject(isInstanceOf(Tombstone))),
  )
);

export const task = {
  isEnergyHarvestingTask,
  isEnergyDeliveryTask,
  isPickupTask,
  isEnergyAcquireTask,
};

const commands = {
  logic,
  creep,
  target,
}

export default function evaluate(command) {
  return _.get(commands, command);
}
