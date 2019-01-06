import { take, put, call, takeEvery } from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import createSaga from '../utils/createSaga';
import createReducer from '../utils/createReducer';
import runTasks from '../tasks';
import * as handlers from './tasks';
import {
  LOOP,
} from '../events';

export const ADD_TASK = 'SPAWN_ADD_TASK';
export const REMOVE_TASK = 'SPAWN_REMOVE_TASK';

export const actionCreators = {
  addTask(spawnName, task) {
    if (_.isString(task)) {
      task = { action: task };
    }
    return {
      type: ADD_TASK,
      payload: {
        spawnName,
        task,
      },
    };
  },
}

createSaga(
  function* () {
    const chan = eventChannel(emitter => {
      global.addSpawnTask = function addTask(spawn, task) {
        emitter(actionCreators.addTask(spawn, task));
      }
      return () => {
        delete global.addSpawnTask;
      };
    })
    while (true) {
      yield put(yield take(chan));
    }
  },
  function* () {
    yield takeEvery(LOOP, function* spawnRunTasks() {
      for (let spawn of Object.values(Game.spawns)) {
        yield call(runTasks, spawn, handlers);
      }
    })
  }
);


createReducer('spawns', Memory.spawns || {}, {
  [ADD_TASK](spawns, { payload: { spawnName, task } }) {
    const newTasks = Array.isArray(task) ? task : [task];
    const oldTasks = spawns[spawnName] && spawns[spawnName].tasks || [];
    return {
      ...spawns,
      [spawnName]: {
        ...spawns[spawnName],
        tasks: [...oldTasks, ...newTasks],
      },
    }
  },
  [REMOVE_TASK](spawns, { payload: { spawnName, task } }) {
    const newTasks = Array.isArray(task) ? task : [];
    const oldTasks = spawns[spawnName] && spawns[spawnName].tasks || [];
    return {
      ...spawns,
      [spawnName]: {
        ...spawns[spawnName],
        tasks: _.difference(oldTasks, newTasks),
      },
    };
  },
});
