import range from 'lodash.range';
import mapValues from 'lodash.mapvalues';
import { createSelector } from 'reselect';
import { put, select, takeEvery } from 'redux-saga/effects'
import {
  scout,
} from '../utils/room';
import createReducer from '../utils/createReducer';
import createModule from '../utils/createModule';
import createSaga from '../utils/createSaga';
import {
  RUN,
} from '../events';

const ROOM_INFO = 'MAP_ROOM_INFO';

export const actionCreators = {
  roomInfo(info) {
    return {
      type: ROOM_INFO,
      payload: info,
    };
  },
};

const root = state => state.Map;
const selectRooms = createSelector(
  root,
  map => map.rooms,
);
const selectMap = createSelector(
  selectRooms,
  rooms => (new TreeModel).parse(rooms),
);

const MIRROR_DIRECTION = {
  left: 'right',
  right: 'left',
  bottom: 'top',
  top: 'bottom',
};
function findRoom(name, rooms) {
  return rooms.find(room => room.name === name);
}
const selectRoomExploration = createSelector(
  selectRooms,
  rooms => {
    const explored = [];
    const unexplored = [];

    rooms.forEach(room => {
      if (!explored.includes(room.name)) {
        // console.log('does not exist')
        explored.push(room);
      }
      Object.entries(room.exits).forEach(([direction, name]) => {
        if(!findRoom(name, explored)) {
         const existingUnexplored = findRoom(name, unexplored);
         if (!existingUnexplored) {
           unexplored.push({
             name,
             exit: {
               [MIRROR_DIRECTION[direction]]: room.name
             }
           });
         } else {
           existingUnexplored.exit[MIRROR_DIRECTION[direction]] = room.name;
         }
       }
      });
    });

    return {
      explored,
      unexplored,
    };
  }
)
const selectUnexploredRooms = createSelector(
  selectRoomExploration,
  ({ unexplored }) => unexplored,
)
const selectExploredRooms = createSelector(
  selectRoomExploration,
  ({ explored }) => explored,
)
export const selectors = {
  rooms: selectRooms,
  explored: selectExploredRooms,
  unexplored: selectUnexploredRooms,
};

export function init(store) {
  global.Map = {
    ...mapValues(actionCreators, action => (...args) => store.dispatch({
      type: 'EXE',
      payload: action(...args),
    })),
    selectors: mapValues(selectors, selector => () => selector(store.getState())),
  };
}

function* start() {
  yield takeEvery(RUN, function* onMapStart() {
    const exploredRooms = yield select(selectExploredRooms);

    if (!exploredRooms.length) {
      yield put(actionCreators.roomInfo(scout(Game.spawns['Spawn1'].room)));
    }
  });
}

createSaga(
  start,
);

const initialState = {
  rooms: [],
};

createReducer('Map', initialState, {
  [ROOM_INFO](state, { payload: roomInfo }) {
    const { name } = roomInfo;
    const existingRoom = state.rooms.find(room => room.name === name);

    let rooms;
    if (existingRoom) {
      const newRoomInfo = {
        ...existingRoom,
        ...roomInfo,
      };
      const indexOfExistingRoom = state.rooms.indexOf(existingRoom);
      rooms = [...state.rooms.slice(indexOfExistingRoom), newRoomInfo, ...state.rooms.slice(indexOfExistingRoom + 1)];
    } else {
      rooms = [roomInfo].concat(state.rooms);

    }
    return {
      ...state,
      rooms,
    };
  },
});

createModule('Map', {
  selectors,
  actionCreators,
});
