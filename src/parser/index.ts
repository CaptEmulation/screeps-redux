import match from './match'

const matcher = match('!foo', {
  foo: (a: any) => a === 'foo',
})

console.log(`bar -> ${matcher('bar')}`)
console.log(`foo -> ${matcher('foo')}`)
