
const MAX_ITERATIONS = 10;
const PRIORITY = 'PRIORITY';
const SLEEP = 'SLEEP';
const DONE = 'DONE';
const SUBTASK = 'SUBTASK';

function createSubContext(task, context) {
  function Context() {
    Object.assign(this, task);
  }
  Context.prototype = Object.create({
    ...context,
    ...context.constructor.prototype,
  });
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

function updateTaskFromContext(myTask, context) {
  Object.assign(myTask, context);
  // Remove any deleted props
  _.difference(Object.keys(myTask), Object.keys(context)).forEach(key => {
    delete myTask[key];
  })
}

function runTasks(gameObjectWithMemory, tasks, handlers) {
  // Obtain priority for every task
  const taskPriorities = [];
  const taskDone = [];
  const taskGens = tasks.map((task, index) => {
    const { myTask, context } = resolveTask(task);
    let handler = handlers[myTask.action];

    if (!handler) {
      console.log(`Task ${myTask.action} is not defined for ${gameObjectWithMemory}`);
      handler = function* (t, { sleep }) { yield sleep(); };
    }

    function priority(num) {
      taskPriorities[index] = num || 0;
      return PRIORITY;
    }

    function sleep() {
      taskPriorities[index] = Infinity;
      return SLEEP;
    }

    function done(result) {
      Object.assign(context, result);
      return DONE;
    }

    function subTask(newHandler, opts) {
      const action = _.isString(newHandler) ? newHandler : newHandler.name;
      if (action) {
        myTask.subTask = {
          action,
          ...opts,
        };
        return SUBTASK;
      }
    }

    return {
      name: myTask.action,
      task,
      myTask,
      context,
      gen: handler && handler(gameObjectWithMemory, {
        priority,
        sleep,
        done,
        subTask,
        context,
        done,
      })
    };
  });
  const priorityResults = taskGens.map(({ name, gen, context, task, myTask }, index) => {
    let result;
    if (gen) {
      try {
        result = gen.next();
      } catch (e) {
        console.log(`Error running task ${name} while getting priority`, e, e.stack);
        result = {
          done: true,
        };
      }
      updateTaskFromContext(myTask, context);
      if (result.done) {
        return { task: tasks[index], priority: Infinity };
      }
      if (!(result.value === SLEEP || result.value === PRIORITY || _.isNumber(taskPriorities[index]))) {
        throw new Error(`Task handler ${name} did not yield a numeric priority.  Instead yielded ${result.value} with priority ${taskPriorities[index]}`);
      }
    }

    return {
      name,
      gen,
      priority: gen ? taskPriorities[index] : -Infinity,
      index,
      context,
      task,
      myTask,
    };
  });
  const validPriTasks = priorityResults.filter(a => a.priority !== Infinity && _.isNumber(a.priority));
  let lastRunTask = null;
  if (validPriTasks.length) {
    const highestPriorityTask = _.min(validPriTasks, a => a.priority);
    if (highestPriorityTask) {
      const { gen, context, myTask, task, index } = highestPriorityTask;
      lastRunTask = myTask;
      let result;
      let subTaskResults;
      let canRunMore = false;
      do {
        if (!(gen && gen.next)) {
          throw new Error(`Not a generator? ${JSON.stringify(highestPriorityTask)}`);
        }
        try {
          result = gen.next(subTaskResults);
        } catch (e) {
          console.log(`Error running task ${myTask.action}`, e, e.stack);
          result = {
            value: DONE,
            done: true,
          };
        }
        if (result.value === DONE) {
          pop(task);
          canRunMore = true;
          break;
        } else if (result.value === SUBTASK) {
          const [newTask, newTaskCanRunMore] = runTasks(gameObjectWithMemory, tasks, handlers);
          subTaskResults = newTask;
          lastRunTask = newTask;
        } else {
          subTaskResults = null;
        }
      } while(!result.done);
      updateTaskFromContext(myTask, context);
      return [lastRunTask, canRunMore && resolveTask(task).myTask !== myTask];
    }
  }
  return [lastRunTask, false];
}

export default function runTask(gameObjectWithMemory, handlers, memoryGetter) {
  if (!memoryGetter && !_.get(gameObjectWithMemory, 'memory.tasks.length')) {
    return null;
  }
  const memory = _.isFunction(memoryGetter) ? memoryGetter(gameObjectWithMemory) : gameObjectWithMemory.memory;
  const tasks = memory.tasks;
  let canRunMore = true;
  let prevTaskTask;
  let lastRunTask = 0;
  let count = 0;
  while(canRunMore && count < MAX_ITERATIONS) {
    prevTaskTask = lastRunTask;
    [lastRunTask, canRunMore] = runTasks(gameObjectWithMemory, tasks, handlers);
    count++;
  }
  if (count >= MAX_ITERATIONS) {
    console.log(`Too many iterations of tasks for ${gameObjectWithMemory}.  Simplify!`);
  }
  memory.lastTask = lastRunTask && lastRunTask.action;
}
