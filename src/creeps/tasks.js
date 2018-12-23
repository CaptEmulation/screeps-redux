import {
  and,
  target as targetMatchers,
} from '../utils/matchers';

const PRIORITY = 'PRIORITY';
const DONE = 'DONE';
const SUBTASK = 'SUBTASK';

function createSubContext(task, context) {
  function Context() {
    Object.assign(this, task);
  }
  Context.prototype = Object.create(context.constructor.prototype);
  return new Context();
}

function resolveTask(task) {
  let myTask = task;
  let context = task;
  while(myTask.subTask) {
    context = createSubContext(myTask.subTask, context);
    myTask = myTask.subTask;
  }
  return { myTask, context };
}

function pop(task) {
  let myTask = task;
  while(myTask.subTask) {
    const nextTask = myTask.subTask;
    if (!nextTask.subTask) {
      break;
    }
    myTask = nextTask;
  }
  delete myTask.subTask;
}

function runTasks(creep, tasks, _handlers = handlers) {
  // Obtain priority for every task
  const taskPriorities = [];
  const taskDone = [];
  const taskGens = tasks.map((task, index) => {
    const { myTask, context } = resolveTask(task);
    const handler = _handlers[myTask.action];

    if (!handler) {
      throw new Error(`Task ${myTask.action} is not defined`);
    }

    function priority(num) {
      taskPriorities[index] = num || 0;
      return PRIORITY;
    }

    function done(result) {
      Object.assign(context, result);
      return DONE;
    }

    function subTask(newHandler, opts) {
      myTask.subTask = {
        action: newHandler.name,
        ...opts,
      };
      creep.say(newHandler.name);
      return SUBTASK;
    }

    return {
      name: myTask.action,
      task,
      myTask,
      context,
      gen: handler({
        creep,
        priority,
        done,
        subTask,
        context,
        done,
      })
    };
  });
  const priorityResults = taskGens.map(({ name, gen, context, task, myTask }, index) => {
    const result = gen.next();
    if (result.done) {
      return { task: tasks[index], priority: Infinity };
    }
    if (result.value !== PRIORITY || !_.isNumber(taskPriorities[index])) {
      throw new Error(`Task handler ${name} did not yield a numeric priority`);
    }
    return {
      name,
      gen,
      priority: taskPriorities[index],
      index,
      context,
      task,
      myTask,
    };
  });
  const highestPriorityTask = _.min(priorityResults, a => a.priority);
  const { gen, context, myTask, task, index } = highestPriorityTask;
  let result;
  let subTaskResults;
  let canRunMore = false;
  do {
    result = gen.next(subTaskResults);
    if (result.value === DONE) {
      pop(task);
      canRunMore = true;
      break;
    } else if (result.value === SUBTASK) {
      const [newTask, newTaskCanRunMore] = runTasks(creep, tasks, _handlers);
      subTaskResults = newTask;
    } else {
      subTaskResults = null;
    }
  } while(!result.done);
  Object.assign(myTask, context);
  // Remove any deleted props
  _.difference(Object.keys(myTask), Object.keys(context)).forEach(key => {
    delete myTask[key];
  })
  return [myTask, canRunMore];
}

export default function runCreepTask(creep, _handlers = handlers) {
  if (!_.get(creep, 'memory.tasks.length')) {
    console.log(`No task assigned to ${creep.name}`);
    return null;
  }
  const tasks = creep.memory.tasks;
  let canRunMore = true;
  let prevTaskTask;
  let lastRunTask = 0;
  let count = 0;
  while(canRunMore && count < 10) {
    prevTaskTask = lastRunTask;
    [lastRunTask, canRunMore] = runTasks(creep, tasks, _handlers);
    count++;
  }
}

function assignMostEnergySource({ creep, context }) {
  const sources = creep.room.find(FIND_SOURCES);
  const source = _.max(sources, source => source.energy);
  if (source) {
    context.sourceId = source.id;
  }
}

function assignClosestEnergySource({ creep, context }) {
  const sources = creep.room.find(FIND_SOURCES);
  const source = creep.pos.findClosestByRange(sources);
  if (source) {
    context.sourceId = source.id;
  }
}

export function* mine({
  creep,
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === creep.carryCapacity) {
    const results = yield subTask(supplySpawn);
    if (_.get(results, 'targets.length') === 0) {
      yield subTask(upgradeController);
    }
  } else {
    return yield subTask(harvest);
  }
}

export function *renewSelf({
  creep,
  done,
  priority,
  context,
}) {
  if (!context.spawnId) {
    const targets = creep.room.find(FIND_STRUCTURES, {
      filter: targetMatchers.isSpawn,
    });
    if (targets.length) {
      context.spawnId = creep.pos.findClosestByRange(targets).id;
    }
  }
  const target = Game.getObjectById(context.spawnId);
  if (!target) {
    // Can't find a spawn to renew at
    yield priority(Infinity);
  } else if (context.isRenewing) {
    // Hold priority while renewing
    yield priority(context.isRenewing);
  } else {
    // priority goes up as tick gets closer to death
    yield priority(-200 + creep.ticksToLive);
  }
  context.isRenewing = context.isRenewing || -200 + creep.ticksToLive;
  if (creep.ticksToLive > 1350) {
    delete context.isRenewing;
    delete creep.memory.target;
    yield done();
  }


  const range = creep.pos.getRangeTo(target);
  if (range > 1) {
    creep.routeTo(target, { range: 1 });
  } else {
    creep.memory.target = target.id;
    target.renewCreep(creep);
  }
}

export function* harvest({
  creep,
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === creep.carryCapacity) {
    delete creep.memory.target;
    return yield done();
  }
  if (!context.sourceId) {
    assignClosestEnergySource({ creep, context });
  }
  const source = Game.getObjectById(context.sourceId);
  const range = creep.pos.getRangeTo(source);
  if (range > 1) {
    creep.routeTo(source, { range: 1 });
  } else {
    creep.memory.target = source.id;
    creep.harvest(source);
  }
}

export function* upgradeController({
  creep,
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === 0) {
    delete creep.memory.target;
    delete creep.memory.range;
    yield done();
  }
  const target = creep.room.controller;
  if (!target) {
    yield done();
  }
  const range = creep.pos.getRangeTo(target);
  if (range > 3) {
    creep.routeTo(target, { range: 3 });
  } else {
    creep.memory.target = target.id;
    creep.memory.range = 3;
    creep.upgradeController(target);
  }
}

export function* supplySpawn({
  creep,
  priority,
  done,
  moveTo,
  subTask,
  context,
}) {
  yield priority();
  if (creep.carry[RESOURCE_ENERGY] === 0) {
    delete creep.memory.target;
    return yield done();
  }
  const targets = creep.room.find(FIND_MY_STRUCTURES, {
    filter: and(
      targetMatchers.isSpawnSupply,
      targetMatchers.needsEnergy,
    ),
  });
  if (targets.length) {
    const target = creep.pos.findClosestByRange(targets);
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      creep.routeTo(target, { range: 1 });
    } else {
      const amount = Math.min(creep.carry[RESOURCE_ENERGY], target.energyCapacity - target.energy);
      creep.transfer(target, RESOURCE_ENERGY, amount);
      creep.memory.target = target.id;
    }
  } else {
    yield done({
      targets,
    });
  }
}

export function* dropResources({
  creep,
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === 0) {
    return yield done();
  }
  const resourceType = _.max(Object.entries(creep.carry), ([type, amount]) => amount)[0];
  creep.drop(resourceType);
}

export const handlers = {
  mine,
  harvest,
  supplySpawn,
  dropResources,
  upgradeController,
  renewSelf,
};
