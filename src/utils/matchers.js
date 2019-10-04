function createMatcher({ matcher, describe, stringify, parse }) {
  const m = item => matcher(item)
  m.describe = item => {
    if (!_.isFunction(describe)) {
      return m.toString()
    }
    return describe(item, m)
  }
  m.stringify = () => stringify(m)
  m.parse = str => parse(str, m)
  return m
}

export function and(...matchers) {
  return createMatcher({
    matcher(value) {
      return matchers.every(m => m(value))
    },
    describe(value) {
      return `(${matchers.map(m => m.describe(value)).join(' AND ')})`
    },
    stringify() {
      return `and(${matchers.join(',')})`
    },
  })
}

export function or(...matchers) {
  return createMatcher({
    matcher(value) {
      return matchers.some(m => m(value))
    },
    describe(value) {
      return `(${matchers.map(m => m.describe(value)).join(' OR ')})`
    },
  })
}

export function not(matcher) {
  return createMatcher({
    matcher(value) {
      return !matcher(value)
    },
    describe(value) {
      return `!(${matcher.describe(value)})`
    },
  })
}

export function eq(source) {
  return createMatcher({
    matcher(value) {
      return source === value
    },
    describe(value) {
      return `${source} === ${value}`
    },
  })
}

export function hasCarryCapacityRemaining(matcher) {
  return createMatcher({
    matcher(creep) {
      return matcher(evalCreep(creep.carryCapacity - _.sum(creep.carry)))
    },
    describe(creep) {
      return `hasCarryCapacityRemaining(${matcher.describe(creep)})`
    },
  })
}

export function is(thing) {
  return createMatcher({
    matcher(target) {
      return target === thing
    },
    describe(target) {
      return `(${thing}) === ${target}`
    },
    tokens() {
      return `IS(${thing})`
    },
    parse(str) {
      //const result = str.match(/^IS\(.*))
    },
  })
}

export function isStructureOfType(type) {
  return createMatcher({
    matcher(target) {
      return target.structureType === type
    },
    describe(target) {
      return `isStructureOfType(${type}) === ${target.structureType}`
    },
  })
}

export function isInstanceOf(instance) {
  return createMatcher({
    matcher(target) {
      return target instanceof instance
    },
    describe(target, m) {
      return `isInstanceOf(${instance}) === ${m(target)}`
    },
  })
}

export const isGameObject = createMatcher({
  matcher(id) {
    return Game.getObjectById(id)
  },
  describe(id, m) {
    return `isGameObject(${id}) === ${m(id)}`
  },
})

export const isMine = createMatcher({
  matcher(target) {
    return target.my === true
  },
  describe(target) {
    return `isMine === ${target.my}`
  },
})

export const needsEnergy = createMatcher({
  matcher(target) {
    if (_.isNumber(target.energy)) {
      return target.energy < target.energyCapacity
    }
    return _.sum(target.store) < target.storeCapacity
  },
  describe(target, m) {
    return `needsEnergy(${target}) === ${m(target)}`
  },
})

function recursivelyLookForSubTask(task, action, matcher) {
  let result
  if (task.subTask) {
    result = recursivelyLookForSubTask(task.subTask, action, matcher)
  }
  if (!result) {
    result = task.action === action && (!matcher || matcher(task))
  }
  return result
}

export function hasTask(name, matcher) {
  return createMatcher({
    matcher(target) {
      return _.get(target, 'memory.tasks', []).find(t =>
        recursivelyLookForSubTask(t, name, matcher)
      )
    },
    describe(target, m) {
      return `hasTask(${target}) === ${m(target)}`
    },
  })
}

export function matchProp(prop, matcher) {
  return createMatcher({
    matcher(value) {
      return matcher(_.get(value, prop))
    },
    describe(value, m) {
      const p = m(value)
      return `matchProp(${prop}) with ${matcher.describe(p, matcher(p))}`
    },
  })
}

export function withGameId(matcher) {
  return createMatcher({
    matcher(id) {
      return matcher(Game.getObjectById(id))
    },
    describe(id, m) {
      const p = Game.getObjectById(id)
      return `withGameId(${id}) with ${matcher.describe(p, matcher(p))}`
    },
  })
}

export function hasBodyType(type) {
  return createMatcher({
    matcher(creep) {
      return creep.body.find(b => b.type === type)
    },
    describe(creep, m) {
      return `hasBody(${type}) === ${m(creep)}`
    },
  })
}
const OFFENSIVE_CREEP_PARTS = [ATTACK, RANGED_ATTACK]
export const offensiveCreep = createMatcher({
  matcher(creep) {
    return creep.body.find(b => OFFENSIVE_CREEP_PARTS.includes(b.type))
  },
  describe(creep, m) {
    return `offensive(${creep}) === ${m(creep)}`
  },
})

export const logic = {
  and,
  not,
  eq,
  or,
}

export const creep = {
  full: hasCarryCapacityRemaining(eq(0)),
  notFull: not(hasCarryCapacityRemaining(eq(0))),
  work: hasBodyType(WORK),
  offensive: offensiveCreep,
}

export const target = {
  isSpawnSupply: or(
    isStructureOfType(STRUCTURE_SPAWN),
    isStructureOfType(STRUCTURE_EXTENSION)
  ),
  needsEnergy,
  isMine,
  isSpawn: isStructureOfType(STRUCTURE_SPAWN),
  isTower: isStructureOfType(STRUCTURE_TOWER),
  isMyTower: and(isStructureOfType(STRUCTURE_TOWER), isMine),
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
    isStructureOfType(STRUCTURE_SPAWN)
  ),
  isMySpawn: and(isStructureOfType(STRUCTURE_SPAWN), isMine),
  isExtension: isStructureOfType(STRUCTURE_EXTENSION),
  isMyExtension: and(isStructureOfType(STRUCTURE_EXTENSION), isMine),
  isContainer: isStructureOfType(STRUCTURE_CONTAINER),
  isController: isStructureOfType(STRUCTURE_CONTROLLER),
  isStorage: isStructureOfType(STRUCTURE_STORAGE),
  isMyStorage: and(isStructureOfType(STRUCTURE_STORAGE), isMine),
  isMyContainer: and(isStructureOfType(STRUCTURE_CONTAINER), isMine),
}

const commands = {
  logic,
  creep,
  target,
}

export default function evaluate(command) {
  return _.get(commands, command)
}
