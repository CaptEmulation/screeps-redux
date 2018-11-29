import range from 'lodash.range';
import get from 'lodash.get';
import mapValues from 'lodash.mapvalues';
import differenceWith from 'lodash.differencewith';
import difference from 'lodash.difference';
import cond from 'lodash.cond';
import intersection from 'lodash.intersection';
import { call, put, select } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import {
  scout as scoutRoom,
} from '../utils/room';
import { actionCreators as spawnActions } from '../Spawn';
import createBrood from '../Creeps/brood';
import {
  actionCreators as mapActions,
  selectors as mapSelectors,
} from '../Map';
import {
  scout,
} from '../Creeps/builds';
import {
  scout as roomScout,
  exits as roomExits,
} from '../utils/room';
import {
  moveTo,
} from '../utils/creeps';
import {
  isColor,
  scoutFlag as scoutFlagColor,
} from '../utils/colors';
import findPath from '../utils/findPath';

const root = state => state.Creeps.Drainer;
const selectRooms = createSelector(
  root,
  Drainer => Drainer.rooms,
);

const drainerTemplate = (num) => ({
  name: `Drainer-${num}`,
  body: [TOUGH, TOUGH, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  memory: {
    role: 'Drainer',
  },
  priority: 10,
  controller: 'Scout',
})

createBrood({
  role: 'Drainer',
  actions: ['start', 'stop'],
  * directCreeps({
    selectors,
  }) {
    const rooms = yield select(selectRooms);
    if (rooms) {

    }
  },
  initialState: {
    rooms: [],
  },
  reducerHandler: actionTypes => ({
    [actionTypes.start](state, { payload: room }) {
      if (state.rooms.includes(room)) {
        return state;
      }
      return {
        ...state,
        rooms: [...state.rooms, state.room],
      };
    },
    [actionTypes.stop](state, { payload: room }) {
      const index = state.rooms.indexOf(room)
      if (index !== -1) {
        return {
          ...state,
          rooms: [...state.rooms.slice(0, index), ...state.rooms.slice(index + 1)],
        };
      }
      return state;
    }
  })
});
