import { and, is, matchProp } from './matchers'

describe('matchers TTD', () => {
  it('can parse', () => {
    const m = and(matchProp('fizz', is(1)), matchProp('buzz', is(0)))
    expect(
      m({
        fizz: 1,
        buzz: 0,
      })
    ).toEqual(true)
    console.log(
      m.describe({
        fizz: 1,
        buzz: 0,
      })
    )
  })
})
