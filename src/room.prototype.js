import {
  hasTask,
} from './utils/matchers';

if (!Object.keys(Room.prototype).includes('sources')) {
  Object.defineProperties(Room.prototype, {
    sources: {
      get() {
        return this.find(FIND_SOURCES);
      },
    },
    minerals: {
      get() {
        return this.find(FIND_MINERALS);
      }
    },
  });
}


Room.prototype.addTask = function addRoomTask(action, opts) {
  this.memory.tasks = this.memory.tasks || [];
  let task;
  if (!hasTask(action)(this)) {
    task = {
      action,
      ...opts,
    };
    this.memory.tasks.push(task);
  } else {
    task = Object.assign(this.memory.tasks.find(t => t.action === action), opts);
  }
  return task;
};
Room.prototype.removeTask = function removeRoomTask(taskName) { return   _.remove(this.memory.tasks, task => task.action === taskName) };
