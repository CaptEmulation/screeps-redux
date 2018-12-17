import { takeEvery, call } from 'redux-saga/effects';
import {
  deadCreeps,
} from '../utils/creeps';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';
import {getPathMatrix, savePathMatrix} from '../utils/pathMatrix';
import {
  COMMIT,
} from '../events';

function *execute(creeps) {
  for (let i = 0; i < creeps.length; i++) {
    const creep = creeps[i];

  }
}

function *commit() {
  yield takeEvery(COMMIT, function* onCreepFinal() {
    // Make our creeps do things
    yield call(execute, Object.values(Game.creeps));
    // Bring out your dead
    // If you need to save anything about recently dead do it on the tick they die
    for (let creep of deadCreeps()) {
      delete Memory.creeps[creep];
    }
    const costMatrix = {};
    for (let creep of Object.values(Game.creeps)) {
      const currentPos = [creep.pos.x, creep.pos.y, creep.room.name];
      if ( !_.isEqual(creep.memory.lastPos, currentPos)) {
        if (!costMatrix[creep.room.name]) {
          costMatrix[creep.room.name] = getPathMatrix(creep.room);
        }
        const value = costMatrix[creep.room.name].get(creep.pos.x, creep.pos.y);
        costMatrix[creep.room.name].set(creep.pos.x, creep.pos.y, value-1);
      }
    }
    for (let [roomName, pathMatrix] of Object.entries(costMatrix)) {
      savePathMatrix(Game.rooms[roomName], pathMatrix);
    }



  });
}

createSaga(
  commit,
);

createModule('Creeps');
