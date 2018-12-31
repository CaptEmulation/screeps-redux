import {
  hasTask,
} from '../../utils/matchers';

export default function* claim(room, {
  priority,
  subTask,
  sleep,
  context,
}) {
  if (!context.targets) {
    console.log('Need to specify a target rooms to claim')
    yield sleep();
  }

  const spawns = room.find(FIND_MY_SPAWNS);
  _.last(spawns).addTask('claimer', {
    targets: context.targets,
  });
  _.last(spawns).addTask('pioneer', {
    targets: context.targets,
  });
  for (let roomName of context.targets) {
    if (Game.rooms[roomName]) {
      Game.rooms[roomName].removeTask('remote');
      Game.rooms[roomName].addTask('bootstrap');
    }
  }
  yield sleep();
}
