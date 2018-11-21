import get from 'lodash.get';
import set from 'lodash.set';
import mapValues from 'lodash.mapvalues';

const _reducer = {};
const _reducers = [];

export function reducer(state, action) {
  let result = mapValues(_reducer, (r, key) => r(get(state, key), action));
  return _reducers.reduce((s, r) => r(s, action), result);
}

export function install(keyPath, r) {
  set(_reducer, keyPath, r);
}

export function appendReducer(reducer) {
  _reducers.push(reducer);
}

export default function createReducer(keyPath, initialState, handlers) {
  const r = typeof keyPath === 'function'
    ? keyPath
    : (state = initialState, action = {}) => {
        if (Object.prototype.hasOwnProperty.call(handlers, action.type)) {
          return handlers[action.type](state, action);
        }
        return state;
      };
  set(_reducer, keyPath, r);
  return r;
}
