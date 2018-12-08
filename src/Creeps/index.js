import { takeEvery, call } from 'redux-saga/effects';
import {
  deadCreeps,
} from '../utils/creeps';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';
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
    const deads = deadCreeps();
    for (let creep of deads) {
      delete Memory.creeps[creep];
    }
  });
}

createSaga(
  commit,
);

createModule('Creeps');
