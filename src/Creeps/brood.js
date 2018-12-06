import mapValues from 'lodash.mapvalues';
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
  RUN,
} from '../events';

export default function broodFactory({
  role,
  enabled = true,
  actions = [],
  directCreeps,
  provideNeeds,
  reducerHandler = () => ({}),
  initialState = {},
} = {}) {
  const allActions = ['enable', 'disable'].concat(actions);
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
  createReducer(broodMember, {
    ...initialState,
    enabled,
  }, {
    // ENABLE
    [ACTIONS[0]](state) {
      return {
        ...state,
        enabled: true,
      };
    },
    // DISABLE
    [ACTIONS[1]](state) {
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
