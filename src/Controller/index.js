import { call, put, select, takeEvery } from 'redux-saga/effects'
import createSaga from '../utils/createSaga';
import commit from '../utils/commit';
import {
  RESET,
  SCAN,
  LOOP,
  RUN,
  UPDATE,
  COMMIT,
  MEMORY_LOAD,
  MEMORY_SAVE,
} from '../events';

export function init(store) {
  const getState = global.getState = function getState() {
    return JSON.stringify(store.getState(), null, 2);
  };
  global.reset = function reset() {
    store.dispatch({ type: RESET });
    commit(store.getState());
    return "reset store";
  }
  global.scan = function scan() {
    store.dispatch({ type: SCAN });
    commit(store.getState());
    return "scan store";
  }
}

const actionCreators = {
  memoryLoad() {
    return {
      type: MEMORY_LOAD,
    };
  },
  scan() {
    return {
      type: SCAN,
    };
  },
  update() {
    return {
      type: UPDATE,
    };
  },
  run() {
    return {
      type: RUN,
    };
  },
  commit() {
    return {
      type: COMMIT,
    };
  },
  memorySave() {
    return {
      type: MEMORY_SAVE,
    };
  },
};

function *executeAndCommit() {
  yield takeEvery('EXE', function* onExe({ payload: action }) {
    yield put(action);
    commit(yield(select(s => s)));
  });
}

function* loop() {
  yield takeEvery(LOOP, function* () {
    yield put(actionCreators.memoryLoad());
    yield put(actionCreators.scan());
    yield put(actionCreators.update());
    yield put(actionCreators.run());
    yield put(actionCreators.commit());
    yield put(actionCreators.memorySave());
  });
}

createSaga(
  loop,
  executeAndCommit,
);
