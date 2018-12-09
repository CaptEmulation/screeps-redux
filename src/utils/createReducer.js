const _reducer = {};
const _reducers = [];

function composeReducer(props) {
  return (state, action) => {
    return _.mapValues(props, (rs, key) => {
      if (Array.isArray(rs)) {
        return rs.reduce(
          (s, r) => r(s, action),
          _.get(state, key)
        );
      } else if (_.isObject(rs)) {
        return composeReducer(rs)(_.get(state, key), action);
      }
      throw new Error('Don\'t know what to do here');
    });
  }
}

export function reducer(state, action) {
  return _reducers
    .reduce(
      (s, r) => r(s, action),
      composeReducer(_reducer)(state, action),
    );
}

export function install(keyPath, r) {
  _.set(_reducer, keyPath, r);
}

export function appendReducer(reducer) {
  _reducers.push(reducer);
}

export default function createReducer(keyPath, initialState, handlers) {
  const r = typeof initialState === 'function'
    ? initialState
    : (state = initialState, action = {}) => {
        if (Object.prototype.hasOwnProperty.call(handlers, action.type)) {
          return handlers[action.type](state, action);
        }
        return state;
      };
  const existingReducer = _.get(_reducer, keyPath);
  if (existingReducer) {
    _.set(_reducer, keyPath, existingReducer.concat([r]));
  } else {
    _.set(_reducer, keyPath, [r]);
  }
  return r;
}
