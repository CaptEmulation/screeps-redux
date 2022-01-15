import { take, put, call, takeEvery } from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import createSaga from '../utils/createSaga';
import createReducer from '../utils/createReducer';
import runTasks from '../tasks';
import * as handlers from './tasks';
import './planner';
import {
  LOOP,
} from '../events';

export const ADD_TASK = 'ROOM_ADD_TASK';
export const REMOVE_TASK = 'ROOM_REMOVE_TASK';

export const actionCreators = {
  addTask(roomName, task) {
    if (_.isString(task)) {
      task = { action: task };
    }
    return {
      type: ADD_TASK,
      payload: {
        roomName,
        task,
      },
    };
  },
}

createSaga(
  function* () {
    const chan = eventChannel(emitter => {
      global.addRoomTask = function addTask(room, task) {
        emitter(actionCreators.addTask(room, task));
      }
      return () => {
        delete global.addRoomTask;
      };
    })
    while (true) {
      yield put(yield take(chan));
    }
  },
  function* () {
    yield takeEvery(LOOP, function* roomRunTasks() {
      if (typeof Game.cpu.bucket === 'undefined' || Game.cpu.bucket > 2000) {
        for (let room of Object.values(Game.rooms)) {
          yield call(runTasks, room, handlers);
        }
      }
    })
  }
);


createReducer('rooms', Memory.rooms || {}, {
  [ADD_TASK](rooms, { payload: { roomName, task } }) {
    const newTasks = Array.isArray(task) ? task : [task];
    const oldTasks = rooms[roomName] && rooms[roomName].tasks || [];
    return {
      ...rooms,
      [roomName]: {
        ...rooms[roomName],
        tasks: [...oldTasks, ...newTasks],
      },
    }
  },
  [REMOVE_TASK](rooms, { payload: { roomName, task } }) {
    const newTasks = Array.isArray(task) ? task : [];
    const oldTasks = rooms[roomName] && rooms[roomName].tasks || [];
    return {
      ...rooms,
      [roomName]: {
        ...rooms[roomName],
        tasks: _.difference(oldTasks, newTasks),
      },
    };
  },
});
