_.maxBy = _.maxBy || function maxBy(array, iteratee) {
  let result
  if (array == null) {
    return result
  }
  let computed;
  for (const value of array) {

    const current = iteratee(value)
    if (current !== null && typeof current !== 'undefined') {
      if (typeof computed === 'undefined' || current > computed) {
        computed = current
        result = value
      }
    }
  }
  return result
}

_.minBy = _.minBy || function minBy(array, iteratee) {
  let result
  if (array == null) {
    return result
  }
  let computed;
  for (const value of array) {

    const current = iteratee(value)

    if (current !== null && current !== undefined) {
      if (computed === undefined || current < computed) {
        computed = current
        result = value
      }
    }
  }
  return result
}
