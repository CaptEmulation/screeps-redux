import { readFile } from 'fs';
import { promisify } from 'util';
import { ScreepsServer, TerrainMatrix } from 'screeps-server-mockup'

const readFileAsync = promisify(readFile);

async function createServer() {
  const server = new ScreepsServer()
  await server.world.reset()

  // set up some terrarin
  // Prepare the terrain for a new room
  const terrain = new TerrainMatrix();
  const walls = [[10, 10], [10, 40], [40, 10], [40, 40]];
  for(let [x, y] of walls) {
      terrain.set(x, y, 'wall')
  }

  // setup a new room
  await server.world.addRoom('W0N1')
  await server.world.setTerrain('W0N1', terrain);
  await server.world.addRoomObject('W0N1', 'controller', 10, 10, { level: 0 });
  await server.world.addRoomObject('W0N1', 'source', 10, 40, { energy: 2000, energyCapacity: 2000, ticksToRegeneration: 300 });
  await server.world.addRoomObject('W0N1', 'source', 40, 10, { energy: 2000, energyCapacity: 2000, ticksToRegeneration: 300 });
  await server.world.addRoomObject('W0N1', 'mineral', 40, 40, { mineralType: 'H', density: 3, mineralAmount: 3000 });
  return server
}

async function createBot(server: ScreepsServer) {
  // load the script
  const main = await readFileAsync('../main.js', 'utf8')

  // add our bot
  const modules = {
    main,
  };

  const bot = await server.world.addBot({ username: 'bot', room: 'W0N1', x: 25, y: 25, modules });
  // Print console logs every tick
  bot.on('console', (logs, results, userid, username) => {
    for (let log of logs) {
      console.log(`${username}: ${log}`);
    }
  });
  return bot
}

async function run() {
  const server = await createServer()
  const bot = await createBot(server)
  await server.start()

  const { db } = await server.world.load()

  for (let i = 1; i < 20000; i++) {
    if (i % 100 === 0) {
      const tick = await server.world.gameTime
      const controller = await db['rooms.objects'].findOne({ $and: [{ room: 'W0N1' }, { type: 'controller' }] });
      const spawns = await db['rooms.objects'].find({ $and: [{ room: 'W0N1' }, { type: 'spawn' }] });
      const towers = await db['rooms.objects'].find({ $and: [{ room: 'W0N1' }, { type: 'tower' }] });
      const creeps = await db['rooms.objects'].find({ $and: [{ room: 'W0N1' }, { type: 'creep' }] });
      const extensions = await db['rooms.objects'].find({ $and: [{ room: 'W0N1' }, { type: 'extension' }] });
      const containers = await db['rooms.objects'].find({ $and: [{ room: 'W0N1' }, { type: 'container' }] });
      
      // const tower = await db['rooms.objects'].findOne({ $and: [{ room: 'W0N1' }, { type: 'tower' }] });
      console.log(`tick: ${tick}`)
      console.log(`controller level: ${controller.level}`)
      console.log(`spawns: ${spawns.length}`)
      console.log(`creeps: ${creeps.length}`)
      console.log(`extensions: ${extensions.length}`)
      console.log(`containers: ${containers.length}`)
      console.log(`towers: ${towers.length}`)
      console.log('------------------------------------------------')
    }
    await server.tick();
  }

  server.stop()
  process.exit()
}

run().then(() => {
  console.log('done')
}, (err) => {
  console.error(err)
})