// Fun but pointless attempt to build a parser. I should just use https://nearley.js.org/
// Also this doesn't work
// type Serializable
interface Token {
  lex: string
  args: any[]
  children: Token[]
}
type Matcher<T> = (t: T) => boolean
type Tokenize<T> = () => Token
type Parser<T> = (s: string) => null | [Matcher<T>, string]

interface TokenizableMatcher<T> extends Matcher<T> {
  token(): Token
}

interface MatcherDefinition<T> {
  matcher: Matcher<T>
  token: Tokenize<T>
}

function createMatcher<T>({
  matcher,
  token,
}: MatcherDefinition<T>): TokenizableMatcher<T> {
  const m = (item: T) => matcher(item)
  m.token = () => token()
  return m
}

function createToken({
  lex,
  args,
  children,
}: {
  lex: string
  args?: any[]
  children?: Token[]
}) {
  return {
    lex,
    args: args ? args : [],
    children: children ? children : [],
  }
}

const MATCH_IS = /^IS\(/
const MATCH_IS_REST = /^.*\)/
export function is(thing: any) {
  return createMatcher<any>({
    matcher(target) {
      return target === thing
    },
    token() {
      return createToken({
        lex: 'IS',
        args: [thing],
        children: [],
      })
    },
  })
}

is.parse = (str: string) => {
  const result = str.match(MATCH_IS)
  if (!result) {
    return null
  }
  const { index } = result
  if (typeof index === 'undefined') {
    return null
  }
  let rest = str.slice(index + result[0].length)[0]
  const endResult = rest.match(MATCH_IS_REST)
  if (!endResult) {
    return null
  }
  const { index: endIndex } = endResult
  if (typeof endIndex === 'undefined') {
    return null
  }

  const target = endResult[0].slice(0, -1)[0]
  rest = rest.slice(endIndex + target.length + 1)
  return [is(target), rest]
}

export function matchProp<T>(prop: string, matcher: TokenizableMatcher<T>) {
  return createMatcher({
    matcher(value) {
      return matcher(_.get(value, prop))
    },
    token() {
      return createToken({
        lex: '.',
        args: [prop],
        children: [matcher.token()],
      })
    },
  })
}

const MATCH_PROP = /^\.\(/
const MATCH_PROP_REST = /^.*\)/
matchProp.parse = (str: string) => {
  const result = str.match(MATCH_PROP)
  if (!result) {
    return null
  }
  const { index } = result
  if (typeof index === 'undefined') {
    return null
  }
  let rest = str.slice(index + result[0].length)[0]
  const endResult = rest.match(MATCH_PROP_REST)
  if (!endResult) {
    return null
  }
  const { index: endIndex } = endResult
  if (typeof endIndex === 'undefined') {
    return null
  }

  const target = endResult[0].slice(0, -1)[0]
  rest = rest.slice(endIndex + target.length + 1)
  return [matchProp(target), rest]
}
