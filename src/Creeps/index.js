import get from 'lodash.get';
import mapValues from 'lodash.mapvalues';
import differenceWith from 'lodash.differencewith';
import difference from 'lodash.difference';
import cond from 'lodash.cond';
import intersection from 'lodash.intersection';
import { call, put, select, takeEvery } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import { actionCreators as spawnActions } from '../Spawn';
import { happy } from '../utils/id';
import createReducer from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createModule from '../utils/createModule';
import {
  RUN,
  FINAL,
} from '../tickEvents';

const PROBE_COUNT = 2;
const SPAWN = 'CREEPS_SPAWN';
const CLEAN = 'CREEPS_CLEAN';

export const actionTypes = {
  SPAWN,
  CLEAN,
};

function spawn(name) {
  return {
    type: SPAWN,
    payload: name,
  };
}

function clean(dead) {
  return {
    type: CLEAN,
    payload: dead,
  };
}


export const actionCreators = {
  spawn,
  clean,
};

const root = state => state.Creeps;
const selectMemoryCreeps = () => Memory.creeps || {};
const selectGameCreeps = () => Game.creeps || {};
const selectDeadCreepNames = createSelector(
  selectMemoryCreeps,
  selectGameCreeps,
  (creepsMem, creepsGame) => difference(Object.keys(creepsMem), Object.keys(creepsGame))
)

export const selectors = {
  memory: selectMemoryCreeps,
  game: selectGameCreeps,
  deadNames: selectDeadCreepNames,
};

export function init(store) {
  global.Early = {
    ...mapValues(actionCreators, action => (...args) => store.dispatch({
      type: 'EXE',
      payload: action(...args),
    })),
    selectors: mapValues(selectors, selector => () => selector(store.getState())),
  };
}

function* run() {
  yield takeEvery(RUN, function* onRun() {

  });
}

function *final() {
  yield takeEvery(FINAL, function* onCreepFinal() {
    const dead = yield select(selectDeadCreepNames);
    yield put(actionCreators.clean(dead));
  });
}

function *cleanUp() {
  yield takeEvery(CLEAN, function *onCreepClean({ payload: dead }) {
    for (let creep in dead) {
      delete Memory.creeps[creep];
    }
  });
}

createSaga(
  run,
  final,
  cleanUp,
);

const initialState = {
  needs: [],
};


export const reducer = createReducer('Creeps', initialState, {
  [SPAWN](state, { payload: creep }) {
    return {
      ...state,
    };
  },
});

createModule('Creeps', {
  selectors,
  actionCreators,
  reducer,
});
