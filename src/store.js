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
    // console.log(action.type, JSON.stringify(store.getState(), null, 2));
  }
}

const store = createStore(reducer, applyMiddleware(sagaMiddleware, logMiddleware));

sagas().forEach(saga => sagaMiddleware.run(saga));

export default store;
