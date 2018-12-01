import mapValues from 'lodash.mapvalues';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import createSaga from '../utils/createSaga';
import { appendReducer } from '../utils/createReducer';
import { names as getModuleNames } from '../utils/createModule';
import commitMemory from '../utils/commit';
import {
  UPDATE,
  COMMIT,
} from '../events';

const CLEAN_DEAD = 'MEMORY_CLEAN_DEAD';
const MEMORY_UPDATE = 'MEMORY_UPDATE';

export const actionCreators = {
  update(state) {
    return {
      type: MEMORY_UPDATE,
      payload: state,
    };
  },
};

export function init(store) {
  global.Garbage = mapValues(actionCreators, action => (...args) => store.dispatch(action(...args)));
}

export function run(store) {
  store.dispatch(cleanDead());
}

const memoryState = () => getModuleNames().reduce((mem, curr) => {
  mem[curr] = Memory[curr];
  return mem;
}, {});

function* update() {
  yield takeEvery(UPDATE, function* onStart() {
    yield put(actionCreators.update(memoryState()));
  });
}

function* commit() {
  yield takeEvery(COMMIT, function * onUpdate() {
    // Assign latest state to memory
    const newState = yield(select(s => s));
    commitMemory(newState);
  });
}

createSaga(
  update,
  commit,
);

appendReducer((state, action) => {
  switch(action.type) {
    case MEMORY_UPDATE: {
      return action.payload;
    }
    default:
      return state;
  }
});
