import createParser, {
  tokenizers,
  operations,
  Token,
  Tokenizer,
} from './rpnParser'

describe('dot', () => {
  it('operation', () => {
    const op = operations.dot('.foo')
    expect(op).toBeDefined()
    expect(op([{ foo: 'bar' }])).toEqual(['bar'])
  })
  it('token', () => {
    const token = tokenizers.dot('.foo')
    expect(token).toBeDefined()
    const [t, str] = token as [Token, string]
    expect(t([{ foo: 'bar' }])).toEqual(['bar'])
    expect(str).toEqual('')
  })
  it('parser', () => {
    const parser = createParser(Object.values<Tokenizer>(tokenizers))
    const tokens = [...parser.tokenize('DUPE .fizz SWAP .buzz EQ')]

    const evaluation = parser.evaluate(tokens, [
      {
        fizz: 0,
        buzz: 1,
      },
    ])
    expect(evaluation).toEqual([false])
  })
})

describe('swap', () => {
  it('operation', () => {
    const op = operations.swap
    expect(op).toBeDefined()
    expect(op([0, 1])).toEqual([1, 0])
    expect(op([1, 0])).toEqual([0, 1])
  })
  it('token', () => {
    const token = tokenizers.swap('SWAP')
    expect(token).toBeDefined()
    const [t, str] = token as [Token, string]
    expect(t([0, 1])).toEqual([1, 0])
    expect(str).toEqual('')
  })
})

describe('dupe', () => {
  it('operation', () => {
    const op = operations.dupe
    expect(op).toBeDefined()
    expect(op([1])).toEqual([1, 1])
  })
  it('token', () => {
    const token = tokenizers.dupe('DUPE')
    expect(token).toBeDefined()
    const [t, str] = token as [Token, string]
    expect(t([1])).toEqual([1, 1])
    expect(str).toEqual('')
  })
})

describe('eq', () => {
  it('operation', () => {
    const op = operations.eq
    expect(op).toBeDefined()
    expect(op([0, 1])).toEqual([false])
    expect(op([1, 1])).toEqual([true])
  })
  it('token', () => {
    const token = tokenizers.eq('EQ')
    expect(token).toBeDefined()
    const [t, str] = token as [Token, string]
    expect(t([0, 1])).toEqual([false])
    expect(t([1, 1])).toEqual([true])
    expect(str).toEqual('')
  })
})
