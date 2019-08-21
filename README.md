# screeps-redux

 Our bot for Screeps. Originally strongly based on redux and redux-saga, now only loosely so. 

## Getting Started

Some global functions are present to help pick a starting location. First place a spawn anywhere in the world. This will allow you to execute console commands. From there you can locate an optimal location for the first spawn in any room (even if you do not have vision). A visual onscreen display of potential spawn location will be shown. Lower numbers are better.

```
getSpawnLocation({
  name: 'W32N45',
  controller: {
    pos: new RoomPosition(10,10,'W32N45')
  },
  sources: [{
    pos: new RoomPosition(11,45,'W32N45')
  }, {
    pos: new RoomPosition(17,29,'W32N45')
  }],
  mineral: {
    pos: new RoomPosition(24,44,'W32N45')
  }
})
```
Enter the correct source and mineral locations for a room. If necessary respawn and then put your spawn at the location specified on the console.

Add the `bootstrap` task to the new room.

```
Game.rooms['roomName'].addTask('bootstrap');
```

That's it!  As the room controller is leveled up, the "bunker" will have its buildings placed automatically. However, roads outside the bunker and walls/ramparts are not yet placed automatically. Placing construction sites will spawn builders that will construct and then recycle themselves when done.

For RCL1 and RCL2, "pioneer" creeps will be spawned to harvest, supply spawn with energy and upgrade controller. At RCL3 containers will be automatically be constructed at the controller and sources. When those are done then pioneers will recycle themselves to be replaced by separate upgraders, static miners and haulers.

## Mining remote rooms

Rooms can support remote mining at RCL3. To configure a spawner to support remote mining:

```
Game.spawns['Spawn1'].addTask('remoteMine', { rooms: ['room1', 'room2'] });
```

## Claiming additional rooms

A room can be instructed to create a claimer and pioneers for a new room with the following command

```
Game.rooms['rcl3 or greater room'].addTask('claim', {
  targets: ['roomName to claim', 'another room if you are feeling greedy']
});
```

That's it!  The room claim task will instruct the spawner to build claimers and pioneers targeting each room to claim the room and create a new bunker layout in the remote room. The source room will continue to support the remote room with pioneers until it gets to rcl3.

## Get out of the way

`Creep.getAllCreepsOutOfTheWay` expects creeps to have a `target` and optionally a `range` saved to memory. This is used to find optimal locations to move creeps out of the way

## Tasks

Generator based task system for game objects with memory. Tasks can be added to rooms, spawns and creeps.

Example:
```
// Basic task
someCreep.addTask('builder');
// Task with options
someCreep.addTask('harvest', {
  sourceId: source.id,
});
```

Options passed into a task are added to the task context (see below)

### Definition

Tasks are generator functions that accept a game instance and a utility object.

Example:
```
export function* construct(creep, {
  priority,
  done,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === 0) {
    delete creep.memory.target;
    delete creep.memory.range;
    yield done();
  }
  const myConstructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (!myConstructionSites.length) {
    yield done({
      noTarget: true,
    });
  }
  // Pick a construction site
  const target = findWorkSites(myConstructionSites);
  const range = creep.pos.getRangeTo(target);
  if (range > 3) {
    creep.routeTo(target, { range: 3 });
  } else {
    creep.memory.target = target.id;
    creep.memory.range = 3;
    creep.build(target);
  }
}

export function* supplySpawn(creep, {
  priority,
  done,
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
      delete creep.memory.target;
    }
  } else {
    yield done({
      noTarget: true,
    });
  }
}

export function* harvest(creep, {
  priority,
  sleep,
  done,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === creep.carryCapacity) {
    delete creep.memory.target;
    return yield done();
  }
  let target;
  if (!context.sourceId) {
    context.sourceId = getSourceId(creep);
  }
  if (context.sourceId) {
    target = Game.getObjectById(context.sourceId);
  }
  if (target) {
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      creep.routeTo(target, { range: 1 });
    } else {
      creep.memory.target = target.id;
      creep.harvest(target);
    }
  }
}

export function* upgradeController(creep, {
  priority,
  done,
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
    yield done({
      noTarget: true,
    });
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

```

### Sub task

Tasks can be composed into higher level tasks using `subTask`. Subtasks can return results when the call `done` which can be used to perform additional logic.

Example:
```
export function* pioneer(creep, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === creep.carryCapacity) {
    let results = yield subTask(supplySpawn);
    if (results.noTarget) {
      results = yield subTask(construct);
      if (results.noTarget) {
        yield subTask(upgradeController);
      }
    }
  } else {
    return yield subTask(harvest);
  }
}
```
`subTask` creates a child task to a parent task. The child task will run until that task calls `done` at which point the parent task will regain control.

### Priority or sleep

All tasks must first yield a priority or a sleep before any other yield. This is used to determine the priority of the task in relation to every other task the creep is assigned. Priorities are in ascending order, so `-Infinity` is the highest priority and `Infinity` is the lowest priority. An `undefined` priority is assumed to be 0.

Yielding sleep will inform the task manager that there is nothing to do for the task. The task will not be considered for priority but also will stay active, for example in the case of a subtask. If you want to sleep for a specific amount of ticks, then `yield sleep(ticks);`

### Context

Tasks can save state to their `context` which is saved to the game object's memory and is associated with the task. Context is destroyed when the task is destroyed so save directly to memory if data needs to be saved past the task lifetime.

Context is shared with sub tasks. For example:

```
export function* master(creep, {
  priority,
  subTask,
}) {
  yield priority();
  context.foo = 'bar';
  yield subTask(slave);
}

export function* slave(creep, {
  priority,
  done,
}) {
  yield priority();
  assert(context.foo === 'bar'); // true
  yield done();
}
```

Context of a task or a sub task can also be defined when they are created:
```
export function* master(creep, {
  priority,
  subTask,
}) {
  yield priority();
  yield subTask(slave, {
    foo: 'bar',
  });
}

export function* slave(creep, {
  priority,
  done,
}) {
  yield priority();
  assert(context.foo === 'bar'); // true
  yield done();
}
```
