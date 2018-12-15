import { takeEvery, put, select } from 'redux-saga/effects';
import {
  deadCreeps,
} from '../utils/creeps';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';
import createReducer from '../utils/createReducer';
import {
  COMMIT,
  SCAN,
  DEATH,
} from '../events';

export const actionCreators = {
  died(creep) {
    return {
      type: DEATH,
      payload: creep,
    };
  },
};

function* scan() {
  yield takeEvery(SCAN, function* onCreepScan() {
    const deads = deadCreeps();
    for (let creep of deads) {
      yield put(actionCreators.died(creep));
    }
  });
}

function* commit() {
  yield takeEvery(COMMIT, function* onCreepFinal() {
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
