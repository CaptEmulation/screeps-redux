
interface Memory {
    creeps: CreepMemory
    flags: FlagMemory
    rooms: RoomMemory
    spawns: SpawnMemory
    powerCreeps: PowerCreepMemory
    [name: string]: any
}
interface CreepMemory { [name: string]: any };
interface FlagMemory { [name: string]: any };
interface SpawnMemory { [name: string]: any };
interface RoomMemory { [name: string]: any };
