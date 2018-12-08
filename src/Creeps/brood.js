import { createSelector } from 'reselect';
import { call, select, takeEvery } from 'redux-saga/effects'
import {
  camelCaseToDash,
} from '../utils/string';
import createReducer from '../utils/createReducer';
import createSaga from '../utils/createSaga';
import createApi from '../utils/createApi';
import createModule from '../utils/createModule';
import {
  START,
  UPDATE,
  RUN,
  COMMIT.
} from '../events';

/*
 * These are default actions provided by being in a brood
 */
const defaultActions = [
  'ENABLE',
  'DISABLE',
  'START',
  'UPDATE',
  'RUN',
  'COMMIT',
].reduce((actions, name, index) => {
  actions[name] = index;
  return actions;
}, {});

export default function broodFactory({
  role,
  enabled = true,
  actions = [],
  directCreeps,
  provideNeeds,
  reducerHandler = () => ({}),
  initialState = {},
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

  const selectActive = createSelector(
    () => Game.creeps || {},
    creeps => Object.values(creeps).filter(creep => creep.memory && creep.memory.role === role),
  );

  const selectors = {
    alive: selectActive,
  };

  function* run() {
    yield takeEvery(RUN, function* onBroodRun() {
      yield call(directCreeps, {
        selectors,
      });
    });
  }

  const broodMember = `Creeps${role}`;
  createReducer(function broodMetaReducer(state, { type }) {
    switch(type) {
      case UPDATE: {
        return {
          ...state,
          brood: {
            ...state.brood,

          },
        }
      }
    }
  });
  createReducer(broodMember, {
    ...initialState,
    enabled,
  }, {
    // ENABLE
    [defaultActions.ENABLE](state) {
      return {
        ...state,
        enabled: true,
      };
    },
    // DISABLE
    [defaultActions.DISABLE](state) {
      return {
        ...state,
        enabled: false,
      };
    },
    ...reducerHandler(actionTypes),
  });

  createApi(broodMember, {
    selectors,
    actionCreators,
  });

  createSaga(
    run,
  );

  createModule(broodMember, {
    selectors,
    actionCreators,
  });

  return {
    actionCreators,
    selectors,
  };
}
