import { createSelector } from 'reselect';
import { call, select, takeEvery } from 'redux-saga/effects'
import {
  camelCaseToDash,
} from '../utils/string';
import createReducer, { appendReducer } from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createApi from '../utils/createApi';
import createModule from '../utils/createModule';
import {
  START,
  SCAN,
  UPDATE,
  RUN,
  COMMIT,
} from '../events';


const metaRoot = state => state.brood;

export function init(store) {
  Object.defineProperty(Creep.prototype, 'brood', {
    get() {
      if (this.memory.role) {
        return metaRoot(store.getState())[this.memory.role];
      }
      return null;
    },
    configurable: false,
  });

  Object.defineProperty(Creep.prototype, 'tasks', {
    get() {
      return _.get(this, 'brood.tasks',[]).filter(t => t.name === this.name);
    },
    configurable: false,
  });
}

createModule('brood', {});

/*
 * These are default actions provided by being in a brood
 */
const defaultActions = [
  'ENABLE',
  'DISABLE',
  'SET',
].reduce((actions, name, index) => {
  actions[name] = index;
  return actions;
}, {});

export default function broodFactory({
  role,
  enabled = true,
  actions = [],
  start,
  scan,
  update,
  run,
  commit,
  provideNeeds,
  reducerHandler = () => ({}),
  initialState,
  selectors: broodSelectors = () => ({}),
} = {}) {
  const allActions = Object.keys(defaultActions).map(a => a.toLowerCase()).concat(actions);

  const TYPE = role.toUpperCase();
  const ACTIONS = allActions.map(camelCaseToDash)
  const ACTION_TYPES = ACTIONS.map(curr => `${TYPE}_${curr}`);

  const actionTypes = allActions.reduce((memo, curr, index) => {
    memo[curr] = ACTION_TYPES[index];
    return memo;
  }, {});

  const actionCreators = allActions.reduce((memo, curr, index) => {
    memo[curr] = payload => ({
      type: ACTION_TYPES[index],
      payload,
    });
    return memo;
  }, {});

  const selectBrood = state => _.get(state, `brood.${role}`);

  const selectAlive = createSelector(
    () => Game.creeps || {},
    creeps => Object.values(creeps).filter(creep => creep.memory && creep.memory.role === role),
  );


  const selectors = {
    alive: selectAlive,
    brood: selectBrood,
  };

  Object.assign(selectors, broodSelectors(selectors));

  createReducer(`brood.${role}`, initialState, {
    [START](brood, { type }) {
      return {
        ...brood,
        enabled,
      };
    },
    [defaultActions.SET](brood, { payload: meta }) {
      return _.merge(
        ..._.clone(brood),
        meta,
      );
    },
    [defaultActions.ENABLE](state) {
      return {
        ...brood,
        enabled: true,
      };
    },
    [defaultActions.DISABLE](state) {
      return {
        ...brood,
        enabled: false,
      };
    },
    ...reducerHandler(actionTypes)
  })

  let sagaDelegates = [];
  if (start) sagaDelegates.push(function* startDelegate() {
    yield takeEvery(START, function* onBroodStart() {
      yield call(start, {
        selectors,
        actionCreators,
      });
    });
  });
  if (scan) sagaDelegates.push(function* updateDelegate() {
    yield takeEvery(SCAN, function* onBroodScan() {
      yield call(scan, {
        selectors,
        actionCreators,
      });
    });
  });
  if (update) sagaDelegates.push(function* updateDelegate() {
    yield takeEvery(UPDATE, function* onBroodUpdate() {
      yield call(update, {
        selectors,
        actionCreators,
      });
    });
  });
  if (run) sagaDelegates.push(function* runDelegate() {
    yield takeEvery(RUN, function* onBroodRun() {
      yield call(run, {
        selectors,
        actionCreators,
      });
    });
  });
  if (commit) sagaDelegates.push(function* commitDelegate() {
    yield takeEvery(COMMIT, function* onBroodRun() {
      yield call(commit, {
        selectors,
        actionCreators,
      });
    });
  });

  createSaga(...sagaDelegates);

  return {
    actionCreators,
    selectors,
  };
}
