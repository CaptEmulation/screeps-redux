import { take, put, call, takeEvery } from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import createSaga from '../utils/createSaga';
import createReducer from '../utils/createReducer';
import runTasks from './tasks';
import {
  LOOP,
} from '../events';

export const ADD_TASK = 'ADD_TASK';
export const REMOVE_TASK = 'REMOVE_TASK';

export const actionCreators = {
  addTask(creepName, task) {
    return {
      type: ADD_TASK,
      payload: {
        creepName,
        task,
      },
    };
  },
}

createSaga(
  function* () {
    const chan = eventChannel(emitter => {
      global.addTask = function addTask(creep, task) {
        emitter(actionCreators.addTask(creep, task));
      }
      return () => {
        delete global.addTask;
      };
    })
    while (true) {
      yield put(yield take(chan));
    }
  },
  function* () {
    yield takeEvery(LOOP, function* creepRunTasks() {
      for (let creep of Object.values(Game.creeps)) {
        yield call(runTasks, creep);
      }
    })
  }
);


createReducer('creeps', Memory.creeps || {}, {
  [ADD_TASK](creeps, { payload: { creepName, task } }) {
    const newTasks = Array.isArray(task) ? task : [task];
    const oldTasks = creeps[creepName] && creeps[creepName].tasks || [];
    return {
      ...creeps,
      [creepName]: {
        ...creeps[creepName],
        tasks: [...oldTasks, ...newTasks],
      },
    }
  },
  [REMOVE_TASK](creeps, { payload: { creepName, task } }) {
    const newTasks = Array.isArray(task) ? task : [];
    const oldTasks = creeps[creepName] && creeps[creepName].tasks || [];
    return {
      ...creeps,
      [creepName]: {
        ...creeps[creepName],
        tasks: _.difference(oldTasks, newTasks),
      },
    };
  },
});
