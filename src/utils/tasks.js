import createMatcher from './matchers';

/*
 * task = {
 *   task: string task name,
 *   while: string matcher name
 *   target: string|object game object id, name or RoomPosition
 *   options: object task options
 * }
 */

function isActive(creep, task) {
  return task.while ? createMatcher(task.while)(creep) : true;
}

function resolveTarget(input) {
  if (_.isString(input)) {
    return Game.getObjectById(input);
  }
  return new RoomPosition(input.x, input.y, input.roomPos);
}

export const creepTasks = {
  harvest(creep, target, {
    resourceType = RESOURCE_ENERGY,
  } = {}) {
    return creep.harvest(target, resourceType);
  },
}

export function execute(creep) {
  const tasks = _.get(creep, 'memory.tasks');
  if (!tasks) {
    return;
  }

  const task = tasks.find(task => !isActive(creep, task));

  const target = resolveTarget(task.target);
  if (creep.pos.inRangeTo()) {

  }
}
