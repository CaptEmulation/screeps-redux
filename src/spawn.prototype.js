import {
  hasTask,
} from './utils/matchers';

Spawn.prototype.addTask = function addSpawnTask(action, opts) {
  this.memory.tasks = this.memory.tasks || [];
  let task;
  if (!hasTask(action)(this)) {
    task = {
      action,
      ...opts,
    };
    this.memory.tasks.push(task);
  } else {
    const task = this.memory.tasks.find(t => t.action === action);
    task = Object.assign(task, opts);
  }
  return task;
};
Spawn.prototype.removeTask = function removeSpawnTask(taskName) { return   _.remove(this.memory.tasks, task => task.action === taskName) };
