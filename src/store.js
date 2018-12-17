import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga'
import { sagas } from './utils/createSaga';
import { reducer } from './utils/createReducer';

const sagaMiddleware = createSagaMiddleware();

function logMiddleware(store) {
  return next => action => {
    // console.log(action.type);
    next(action);
    // console.log(JSON.stringify(Memory.creeps));
    // console.log(action.type, JSON.stringify(store.getState().Spawn.pending.length, null, 2));
  }
}

function rootReducer(state = Memory, action) {
  if (action.type === 'RESET') {
    return reducer(undefined, action);
  }
  return reducer(state, action);
}

const store = createStore(rootReducer, applyMiddleware(sagaMiddleware, logMiddleware));

sagas().forEach(saga => sagaMiddleware.run(saga));

export default store;
