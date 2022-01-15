interface MatcherDefinition<T> {
  matcher: (item: T) => boolean;
  describe: (item: T, matcher: Matcher<T>) => string;
}

interface Matcher<T> {
  (item: T): boolean;
  describe: (item: T) => string;
}

function createMatcher<T>({ matcher, describe }: MatcherDefinition<T>): Matcher<T> {
  const m = (item: T) => matcher(item)
  m.describe = (item: T): string => {
    if (!_.isFunction(describe)) {
      return m.toString()
    }
    return describe(item, m)
  }
  return m
}

export function and<T>(...matchers: Matcher<T>[]): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return matchers.every(m => m(value))
    },
    describe(value) {
      return `(${matchers.map(m => m.describe(value)).join(' AND ')})`
    },
  })
}

export function or<T>(...matchers: Matcher<T>[]): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return matchers.some(m => m(value))
    },
    describe(value) {
      return `(${matchers.map(m => m.describe(value)).join(' OR ')})`
    },
  })
}

export function not<T>(matcher: Matcher<T>): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return !matcher(value)
    },
    describe(value) {
      return `!(${matcher.describe(value)})`
    },
  })
}

export function eq<T>(source: T): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return source === value
    },
    describe(value) {
      return `${source} === ${value}`
    },
  })
}

export function lt<T>(source: T): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return value < source
    },
    describe(value) {
      return `${value} < ${source}`
    },
  })
}

export function lte<T>(source: T): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return value <= source
    },
    describe(value) {
      return `${value} <= ${source}`
    },
  })
}

export function gt<T>(source: T): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return value > source
    },
    describe(value) {
      return `${value} > ${source}`
    },
  })
}

export function gte<T>(source: T): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return value >= source
    },
    describe(value) {
      return `${value} >= ${source}`
    },
  })
}


export function hasCarryCapacityRemaining(matcher: Matcher<number>) {
  return createMatcher({
    matcher(creep: Creep) {
      return matcher(creep.carryCapacity - _.sum(creep.carry))
    },
    describe(creep) {
      return `${creep.name}:hasCarryCapacityRemaining(${matcher.describe(creep.carryCapacity - _.sum(creep.carry))})`
    },
  })
}

export function isStructureOfType(type: StructureConstant) {
  return createMatcher({
    matcher(target: Structure) {
      return target.structureType === type
    },
    describe(target) {
      return `isStructureOfType(${type}) === ${target.structureType}`
    },
  })
}

export function isInstanceOf(instance: any) {
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
  matcher(id: string) {
    return !!Game.getObjectById(id)
  },
  describe(id, m) {
    return `isGameObject(${id}) === ${m(id)}`
  },
})

export const isMine = createMatcher({
  matcher(target: OwnedStructure) {
    return target.my === true
  },
  describe(target) {
    return `isMine === ${target.my}`
  },
})


export const needsEnergy = createMatcher({
  matcher(t: StructureSpawn | StructureExtension | StructureTower | StructureLab | StructureContainer | StructureStorage | StructureTerminal) { 
    if (isStructureWithEnergy(t)) {
      return t.energy < t.energyCapacity
    }
    return _.sum(t.store) < t.storeCapacity
  },
  describe(target, m) {
    return `needsEnergy(${target}) === ${m(target)}`
  },
})

interface Task {
  subTask?: Task
  action: string
}

function recursivelyLookForSubTask(task: Task, action: string, matcher: Matcher<Task>): Task | undefined {
  let result: Task | undefined
  if (task.subTask) {
    result = recursivelyLookForSubTask(task.subTask, action, matcher)
  }
  if (!result) {
    if (task.action === action && (!matcher || matcher(task))) {
      result = task
    }
  }
  return result
}

export function hasTask(name: string, matcher: Matcher<Task>): Matcher<{ memory: any }> {
  return createMatcher({
    matcher(target) {
      return _.get(target, 'memory.tasks', []).find((t: Task) =>
        recursivelyLookForSubTask(t, name, matcher)
      )
    },
    describe(target, m) {
      return `hasTask(${target}) === ${m(target)}`
    },
  })
}

export function matchProp<T>(prop: string, matcher: Matcher<T>): Matcher<T> {
  return createMatcher({
    matcher(value) {
      return matcher(_.get(value, prop))
    },
    describe(value) {
      return `matchProp(${prop}) with ${matcher.describe(value)}`
    },
  })
}

export function withGameId(matcher: Matcher<any>): Matcher<any> {
  return createMatcher({
    matcher(id) {
      return matcher(Game.getObjectById(id))
    },
    describe(id) {
      const p = Game.getObjectById(id)
      return `withGameId(${id}) with ${matcher.describe(p)}`
    },
  })
}

export function hasBodyType(type: BodyPartConstant): Matcher<Creep> {
  return createMatcher({
    matcher(creep) {
      return !!creep.body.find(b => b.type === type)
    },
    describe(creep, m) {
      return `hasBody(${type}) === ${m(creep)}`
    },
  })
}
const OFFENSIVE_CREEP_PARTS = [ATTACK, RANGED_ATTACK]
export const offensiveCreep = createMatcher({
  matcher(creep: Creep) {
    return creep.body.some(b => {
      for (const part of OFFENSIVE_CREEP_PARTS) {
        if (b.type === part) {
          return true
        }
      }
    })
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

const _isStructureWithEnergy = or(
  isStructureOfType(STRUCTURE_SPAWN),
  isStructureOfType(STRUCTURE_EXTENSION),
  isStructureOfType(STRUCTURE_TOWER),
  isStructureOfType(STRUCTURE_STORAGE),
  isStructureOfType(STRUCTURE_NUKER),
  isStructureOfType(STRUCTURE_LAB),
  isStructureOfType(STRUCTURE_LINK),
)

const  _isStructureWithStorage = or(
  isStructureOfType(STRUCTURE_STORAGE),
  isStructureOfType(STRUCTURE_TERMINAL),
)

function isStructureWithEnergy(structure: Structure): structure is StructureSpawn | StructureExtension | StructureLab | StructureLink | StructureNuker | StructureTower {
  return _isStructureWithEnergy(structure)
}
function isStructureWithStorage(structure: Structure): structure is StructureStorage | StructureTerminal | StructureContainer {
  return _isStructureWithStorage(structure)
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
  isStructureWithEnergy,
  isStructureWithStorage,
  isMySpawn: and(isStructureOfType(STRUCTURE_SPAWN), isMine),
  isExtension: isStructureOfType(STRUCTURE_EXTENSION),
  isMyExtension: and(isStructureOfType(STRUCTURE_EXTENSION), isMine),
  isContainer: isStructureOfType(STRUCTURE_CONTAINER),
  isController: isStructureOfType(STRUCTURE_CONTROLLER),
  isStorage: isStructureOfType(STRUCTURE_STORAGE),
  isMyStorage: and(isStructureOfType(STRUCTURE_STORAGE), isMine),
  isMyContainer: and(isStructureOfType(STRUCTURE_CONTAINER), isMine),
}

