export default function* dropResources(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === 0) {
    return yield done();
  }
  const resourceType = _.max(Object.entries(creep.carry), ([type, amount]) => amount)[0];
  creep.drop(resourceType);
}
