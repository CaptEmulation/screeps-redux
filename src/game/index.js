import { takeEvery } from 'redux-saga/effects';
import createSaga from '../utils/createSaga';
import {
  LOOP,
} from '../events';

createSaga(
  function* () {
    yield takeEvery(LOOP, function* gameRunTasks() {
      // Find all rooms of all spawns with no bootstrap task
      for(let spawn of Object.values(Game.spawns)) {
        if (!spawn.memory.tasks) {
          const room = Game.rooms[spawn.room.name];
          if (room) {
            console.log(`Room ${room.name} has no tasks. Adding bootstrap task.`);
            room.addTask('bootstrap')
            room.addTask('stats')
          }
        }
      }
    })
  }
);

