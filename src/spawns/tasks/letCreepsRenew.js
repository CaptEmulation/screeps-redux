import {
  periodically,
} from '../../utils/tick';


const period = periodically(5);

export default function* letCreepsRenew(spawn, {
  priority,
  context,
  sleep,
  done,
}) {
  if (!context.renewing || period()) {
    context.renewing = spawn.pos.neighbors.filter(
      pos => {
        const look = pos.lookFor(LOOK_CREEPS)
        return look && look.find(look => look.type === 'creep' && look.creep.memory.lastTask === 'renewSelf')
      },
    ).length > 0;
  }

   if (context.renewing) {
     yield priority(-10);
     yield done();
   } else {
     yield sleep();
   }

}
