export default function* move(
  creep: Creep,
  {
    priority,
    context,
  }: {
    priority: (p: undefined | number) => void
    context: any
  }
) {
  yield priority(context.priority)
  // finish parser
}
