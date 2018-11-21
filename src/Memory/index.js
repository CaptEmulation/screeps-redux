import mapValues from 'lodash.mapvalues';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import createSaga from '../utils/createSaga';
import { appendReducer } from '../utils/createReducer';
import { names as getModuleNames } from '../utils/createModule';
import commit from '../utils/commit';
import {
  START,
  FINAL,
} from '../tickEvents';

const CLEAN_DEAD = 'MEMORY_CLEAN_DEAD';
const UPDATE = 'MEMORY_UPDATE';

function cleanDead() {
  for (let creep in Memory.creeps) {
    if (!Game.creeps[creep]) {
      delete Memory.creeps[creep];
    }
  }
  return { type: CLEAN_DEAD };
}

function update() {
  return {
    type: UPDATE,
    payload: getModuleNames().reduce((mem, curr) => {
      mem[curr] = Memory[curr];
      return mem;
    }, {}),
  };
}

export const actionCreators = {
  cleanDead,
  update,
};

export function init(store) {
  global.Garbage = mapValues(actionCreators, action => (...args) => store.dispatch(action(...args)));
}

export function run(store) {
  store.dispatch(cleanDead());
}

function* start() {
  yield takeEvery(START, function* onStart() {
    yield put(update());
  });
}

function* final() {
  yield takeEvery(FINAL, function * onUpdate() {
    yield put(cleanDead());
    // Assign latest state to memory
    const newState = yield(select(s => s));
    commit(newState);
  });
}

createSaga(
  start,
  final,
);

appendReducer((state, action) => {
  switch(action.type) {
    case UPDATE: {
      return action.payload;
    }
    default:
      return state;
  }
});
