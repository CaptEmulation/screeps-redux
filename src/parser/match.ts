const { Grammar, Parser } = require('nearley')
const grammar = require('./grammar.js')
import { and, or, not } from '../utils/matchers'

const parser = new Parser(Grammar.fromCompiled(grammar))

export type Context = { [key: string]: any }
const cache: Context = {}

export function evaluate(ast: any, context: Context): any {
  if (ast.operator) {
    switch (ast.operator) {
      case 'and': {
        return and(evaluate(ast.left, context), evaluate(ast.right, context))
      }
      case 'or': {
        return or(evaluate(ast.left, context), evaluate(ast.right, context))
      }
      case 'not': {
        return not(evaluate(ast.expression, context))
      }
      case 'parens': {
        return evaluate(ast.expression, context)
      }
      case 'lambda': {
        if (!context[ast.name]) {
          throw new Error(`${context.name} not defined in context`)
        }
        return context[ast.name](evaluate(ast.input, context))
      }
      default:
        throw new Error(`Operator ${ast.operator} not defined`)
    }
  }
  if (ast.statement) {
    if (!context[ast.statement]) {
      throw new Error(`${ast.statement} not defined in context`)
    }
    return context[ast.statement]
  }
  throw new Error(`Failed to parse ${JSON.stringify(ast)}`)
}

export default function(statement: string, context: Context) {
  if (!cache[statement]) {
    const start = Date.now()
    const [ast] = parser.feed(statement)
    const operation = evaluate(ast, context)
    cache[statement] = operation
    console.log(
      `Finished parsing length: ${statement.length} in ${(
        (Date.now() - start) /
        1000
      ).toFixed(3)}`
    )
  }
  return cache[statement]
}
