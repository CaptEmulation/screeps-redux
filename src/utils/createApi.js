export const api = {};

export default function defineApi(keyPath, {
  actionCreators,
  selectors,
}) {
  // set(api, keyPath, {
  //   ...mapValues(actionCreators, action => (...args) => store.dispatch({
  //     type: 'EXE',
  //     payload: action(...args),
  //   })),
  //   ...Object.defineProperties({}, mapValues(selectors, selector => ({
  //     get() { return selector(store.getState()); },
  //     writeable: false,
  //     enumerable: true,
  //   }))),
  // })
}
