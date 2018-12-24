
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

function runTasks(gameObjectWithMemory, tasks, handlers) {
  // Obtain priority for every task
  const taskPriorities = [];
  const taskDone = [];
  const taskGens = tasks.map((task, index) => {
    const { myTask, context } = resolveTask(task);
    const handler = handlers[myTask.action];

    if (!handler) {
      throw new Error(`Task ${myTask.action} is not defined for ${gameObjectWithMemory}`);
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
      return SUBTASK;
    }

    return {
      name: myTask.action,
      task,
      myTask,
      context,
      gen: handler(gameObjectWithMemory, {
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
      const [newTask, newTaskCanRunMore] = runTasks(gameObjectWithMemory, tasks, handlers);
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
  return [myTask, canRunMore && resolveTask(task).myTask !== myTask];
}

export default function runTask(gameObjectWithMemory, handlers) {
  if (!_.get(gameObjectWithMemory, 'memory.tasks.length')) {
    console.log(`No task assigned to ${gameObjectWithMemory}`);
    return null;
  }
  const tasks = gameObjectWithMemory.memory.tasks;
  let canRunMore = true;
  let prevTaskTask;
  let lastRunTask = 0;
  let count = 0;
  while(canRunMore && count < 10) {
    prevTaskTask = lastRunTask;
    [lastRunTask, canRunMore] = runTasks(gameObjectWithMemory, tasks, handlers);
    count++;
  }
}
