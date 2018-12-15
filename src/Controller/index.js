import { call, put, select, takeEvery } from 'redux-saga/effects'
import createSaga from '../utils/createSaga';
import commit from '../utils/commit';
import createReducer from '../utils/createReducer';
import {
  actionCreators as taskActions,
  selectors as taskSelectors,
} from '../Tasks';
import {
  task as taskMatchers,
} from '../utils/matchers';
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

const taskCreators = {
  energyDelivery(id) {
    return {
      action: 'transfer',
      target: id,
      type: RESOURCE_ENERGY,
    }
  }
}

function *executeAndCommit() {
  yield takeEvery('EXE', function* onExe({ payload: action }) {
    yield put(action);
    commit(yield(select(s => s)));
  });
}

function scanRoomForSources(room) {
  room.memory.sources = room.find(FIND_SOURCES).map(source => ({
    id: source.id,
    pos: [source.pos.x, source.pos.y, source.pos.roomName],
  }));
}

function scanRoomForContainersNearSources(room) {
  const containerlessSourceRefs = room.memory.sources.filter(s => !s.container || (s.container && s.container.container));
  if (containerlessSourceRefs.length) {
    const containers = room.find(FIND_STRUCTURES, {
      filter: (target) => target.structureType === STRUCTURE_CONTAINER
    });
    for (let sourceRef of containerlessSourceRefs) {
      const sourcePos = new RoomPosition(...sourceRef.pos);
      const container = containers.find(container => container.pos.getRangeTo(sourcePos) <= 2);
      if (container) {
        sourceRef.container = {
          id: container.id,
          pos: [container.pos.x, container.pos.y, container.pos.roomName],
        };
      }
    }
  }
}

function *scanRooms() {
  for (let room of Object.values(Game.rooms)) {
    let newTasks;
    const roomTaskSelectors = taskSelectors.forRoom(room);
    if (!room.memory.scanned) {
      if (room.controller && room.controller.my) {
        if (!room.memory.sources) {
          scanRoomForSources(room);
        }
      }
    }
    if (room.controller && room.controller.my) {
      scanRoomForContainersNearSources(room);

      // Look for structures that need energy delivery
      // TODO: just look for structures as they are created and add automatically
      const energyDelivery = yield select(roomTaskSelectors.energyDelivery);
      const targetIdsNeedingDelivery = _.difference(room.memory.sources.map(s => s.id), energyDelivery.map(t => t.target));
      newTasks.push(...targetIdsNeedingDelivery.map(id => taskCreators.energyDelivery(id)));

      // Look for energy that need to be picked up
      const energyAcquire = yield select(roomTaskSelectors.energyAcquire);
      const targetIdsNeedingDelivery = _.difference(room.memory.sources.map(s => s.id), energyDelivery.map(t => t.target));
    }
  }
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

// Flushes all reselect caches at the begining of a tick
createReducer('tick', Game.time, {
  LOOP() {
    return Game.time;
  },
});
