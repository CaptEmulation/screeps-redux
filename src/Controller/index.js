import { call, put, select, takeEvery } from 'redux-saga/effects'
import createSaga from '../utils/createSaga';
import commit from '../utils/commit';

export function init(store) {
  const getState = global.getState = function getState() {
    return JSON.stringify(store.getState(), null, 2);
  };
  global.reset = function reset() {
    store.dispatch({ type: 'RESET' });
    commit(store.getState());
    return getState();
  }
}

function *executeAndCommit() {
  yield takeEvery('EXE', function* onExe({ payload: action }) {
    yield put(action);
    commit(yield(select(s => s)));
  });
}

createSaga(executeAndCommit);
