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
} from '../events';

export function init(store) {
  const getState = global.getState = function getState() {
    return JSON.stringify(store.getState(), null, 2);
  };
  global.reset = function reset() {
    store.dispatch({ type: RESET });
    commit(store.getState());
  }
  global.scan = function scan() {
    store.dispatch({ type: SCAN });
    commit(store.getState());
  }
}

const actionCreators = {
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
  }
};

function *executeAndCommit() {
  yield takeEvery('EXE', function* onExe({ payload: action }) {
    yield put(action);
    commit(yield(select(s => s)));
  });
}

function* loop() {
  yield takeEvery(LOOP, function* () {
    yield put(actionCreators.scan());
    yield put(actionCreators.update());
    yield put(actionCreators.run());
    yield put(actionCreators.commit());
  });
}

createSaga(
  loop,
  executeAndCommit,
);
