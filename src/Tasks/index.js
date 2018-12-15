import { creaseSelector } from 'reselect';
import { put, select } from 'redux-saga/effects';
import createReducer from '../utils/createReducer';
import createModule from '../utils/createModule';
import {
  task as taskMatchers,
} from '../utils/matchers';
import harvestTask from './harvest';

export const actionTypes = {
  TASKS_ADD: 'TASKS_ADD',
  TASKS_UPDATE: 'TASKS_UPDATE',
  TASKS_REMOVE: 'TASKS_REMOVE'
}

const taskCreators = {
  energyDelivery(id) {
    return {
      action: 'transfer',
      target: id,
      type: RESOURCE_ENERGY,
    }
  },

}

const actionCreators = {
  add(task) {
    return {
      type: TASKS_ADD,
      payload: task,
    };
  },
  update(task) {
    return {
      type: TASKS_UPDATE,
      payload: task,
    };
  },
  remove(task) {
    return {
      type: TASKS_REMOVE,
      payload: task,
    };
  },
};

let currentTick;
let taskIndexThisTick;

function resetTick() {
  currentTick = Game.time;
  taskIndexThisTick = 0;
}

function getId() {
  if (currentTick !== Game.time) {
    resetTick();
  }
  return `${currentTick}:${taskIndexThisTick++}`;
}

export function* add(task) {
  const id = task.id = task.id || getId();
  yield put(actionCreators.add(task));
  return id;
}

export function* run() {
  yield takeEvery(function* runTask() {

  });
}

createReducer('tasks', [], {
  [TASKS_ADD](tasks, { payload }) {
    const newTasks = (Array.isArray(payload) ? payload : [payload]).map(task => ({
      priority: 0,
      ...task,
    }));
    return [...newTasks, ...tasks];
  },
  [TASKS_UPDATE](tasks, { payload }) {
    const updateTasks = (Array.isArray(payload) ? payload : [payload]);
    const existingTasks = tasks
      .filter(t => updateTasks.find(task => task.id === t.id));

    return [...updateTasks.map(task => ({
      ...task,
      ...tasks.find(t => t.id === task.id),
    })), ...existingTasks];
  },
  [TASKS_REMOVE](tasks, { payload }) {
    const removeTasks = (Array.isArray(payload) ? payload : [payload]);
    return tasks.filter(task => removeTasks.every(removeTask => removeTask.id !== task.id));
  },
});

const selectTasks = state => state.tasks;
const selectorForRoom = room => {
  const selectRoomTasks = createSelector(
    selectTasks,
    tasks => tasks.filter(task => task.room === room.name).
  );
  const selectHarvestTasks = createSelector(
    selectRoomTasks,
    tasks => tasks.filter(taskMatchers.isEnergyHarvestingTask),
  );
  const selectEnergyDeliveryTasks = createSelector(
    selectRoomTasks,
    tasks => tasks.filter(taskMatchers.isEnergyDeliveryTask),
  );
  const selectEnergyAcquireTasks = createSelector(
    selectRoomTasks,
    tasks => tasks.filter(taskMatchers.isEnergyAcquireTask),
  );
  return {
    tasks: selectRoomTasks,
    harvest: selectHarvestTasks,
    energyDelivery: selectEnergyDeliveryTasks,
    energyAcquire: selectEnergyAcquireTasks,
  };
};

export const selectors = {
  tasks: selectTasks,
  forRoom: selectorForRoom,
};
