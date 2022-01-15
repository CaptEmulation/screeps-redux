import { eq } from './matchers'
const { get } = _

type Stack = any[]
export type Token = (stack: Stack) => Stack
type TokenizerResult = null | [Token, string]
export type Tokenizer = (str: string) => TokenizerResult

export const match = {
  dot: /^\.\S*(\s|$)/i,
  eq: /^EQ(\s|$)/i,
  lt: /^LT(\s|$)/i,
  lte: /^LTE(\s|$)/i,
  gt: /^GT(\s|$)/i,
  gte: /^GTE(\s|$)/i,
  swap: /^SWAP(\s|$)/i,
  dupe: /^DUPE(\s|$)/i,
}

export const operations = {
  dot: (_path: string) => {
    const path = _path.slice(1)
    return (stack: Stack) => {
      return [...stack.slice(0, -1), get(stack.slice(-1)[0], path)]
    }
  },
  eq: (stack: Stack) => {
    const matches = eq(stack.pop())(stack.pop())
    return [...stack, matches]
  },
  swap: (stack: Stack) => [
    ...stack.slice(0, -2),
    ...stack.slice(-1),
    ...stack.slice(-2, -1),
  ],
  dupe: (stack: Stack) => [...stack, ...stack.slice(-1)],
}

export const tokenizers: { [key: string]: Tokenizer } = {
  dot(str: string): TokenizerResult {
    const result = str.match(match.dot)
    if (!result) {
      // console.log(`does not match ${str}`)
      return null
    }
    const { index = 0 } = result
    // console.log(result)
    const first = result[0].trim()
    const rest = str.slice(index + result[0].length)
    // console.log(`dot ["${first}",  "${rest}"]`)
    return [operations.dot(first), rest]
  },
  eq(str: string): TokenizerResult {
    const result = str.match(match.eq)
    if (!result) {
      return null
    }
    const { index = 0 } = result
    const rest = str.slice(index + result[0].length)
    return [operations.eq, rest]
  },
  swap(str: string): TokenizerResult {
    const result = str.match(match.swap)
    if (!result) {
      return null
    }
    const { index = 0 } = result
    const rest = str.slice(index + result[0].length)
    return [operations.swap, rest]
  },
  dupe(str: string): TokenizerResult {
    const result = str.match(match.dupe)
    if (!result) {
      return null
    }
    const { index = 0 } = result
    const rest = str.slice(index + result[0].length)
    return [operations.dupe, rest]
  },
}

export default function init(tokenizers: Tokenizer[]) {
  const parser = {
    *tokenize(str: string) {
      let result
      let lastInput: string = str
      let input: string = str
      // console.log('start', str)
      do {
        lastInput = input
        for (let t of tokenizers) {
          const test = t(input)
          // console.log('test', test)
          if (!test) continue
          const [newToken, remainingString] = test
          // console.log(newToken, remainingString, test, input, lastInput)
          lastInput = input
          input = remainingString
          // console.log(`yielding ${newToken}`)
          yield newToken
        }
        // console.log(
        // `input: ${input} lastInput: ${lastInput} result: ${(input &&
        //   input.length > 0 &&
        //   input[0] !== '') ||
        //   lastInput !== input}`
        // )
      } while (
        input &&
        input.length > 0 &&
        input[0] !== '' &&
        lastInput !== input
      )
    },
    evaluate(tokens: Token[], input: Stack) {
      let outStack = [...input]
      for (let token of tokens) {
        outStack = token(outStack)
      }
      return outStack
    },
  }

  return parser
}
