// Object style reducer
const composedReducer = {
  _r: [],
};
// A list of function reducers
const reducerList = [];

function handleReducer(reducer, state, action) {

}

{
  _r: [],
  brood: {
    _r: [],
    task: [],
  }
}
root = {
  _reducers:
  _props: {

  }
}

reduceVarient(unknown, key, state, action) {
  if (Array.isArray(unknown)) {
    return reduceArray(key, rs, state, action);
  } else if (unknown instanceof Object) {

  }
}

function reduceArray(key, rs, state, action) {
  return rs.reduce(
    (s, r) => r(s, action),
    _.get(state, key)
  );
}

function reduceProps(props, state, action) {
  return _.mapValues(props, (rs, key) => {
    return reduceVarient()
  });
}

// Recursively iterates through objects to find and invoke lists of reducers
function reduceProps(props) {
  return (state, action) => {
    return _.mapValues(props, (rs, key) => {
      if (Array.isArray(rs)) {
        return reduceArray(key, rs, state, action);
      } else if (_.isObject(rs)) {
        return reduceProps(rs)(_.get(state, key), action);
      }
      throw new Error('Don\'t know what to do here');
    });
  }
}

// Don't try to think about this one too much....
export function reducer(state, action) {
  // First run composed object reducer (these are scoped ducks)
  const reducedObject = reduceProps(composedReducer)(state, action);

  // Then give the list of reducers a chance to operate on the entire state (for reasons)
  return reducerList
    .reduce(
      (s, r) => r(s, action),
      reducedObject,
    );
}

export function install(keyPath, r) {
  let prevNode;
  let node = composedReducer;
  for (const key of keyPath.split('.')) {
    if (typeof node[key] === 'undefined') {
      node[key] = {};
    } else if (Array.isArray(key)) {
      node[key] = {
        _r: node[key],
      };
    }
    prevNode = node;
    node = node[key];
  }
  if (typeof node === 'undefined') {
    prevNode[lastKey] = [r];
  } else if (Array.isArray(node)) {
    node.push(r);
  } else if (node instanceof Object) {
    node['_r'] = node['_r'] || [];
    node['_r'].push(r);
  }
}

// export function getFunctionalReducers(keyPath) {
//   const target = _.get(composedReducer, keyPath, []);
//   if (Array.isArray(target)) {
//     return target;
//   }
//   if (target instanceof Object) {
//     return target.
//   }
//   return target && target.
// }

export function appendReducer(reducer) {
  reducerList.push(reducer);
}

function walkToReducer(reducer, keyPath) {

}

export default function createReducer(keyPath, initialState, handlers) {
  let r;
  let isRoot = false;
  if (typeof initialState === 'function') {
    r = initialState;
  } else if (typeof keyPath === 'function') {
    r = keyPath;
    isRoot = true;
  } else {
    r = (state = initialState, action = {}) => {
        if (Object.prototype.hasOwnProperty.call(handlers, action.type)) {
          return handlers[action.type](state, action);
        }
        return state;
      }
  }

  if (isRoot) {
    composedReducer['_r'].push(r);
  } else {
    install(keyPath, [...get(keyPath), r]);
  }

  return r;
}
