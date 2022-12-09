// @ts-nocheck
import * as server from "@minecraft/server";

console.warn("=== MOTD Loaded! ===");
console.log("test");
console.error("test");

interface TickCallbacks {
  remainingTicks: number;
  callback: () => void;
}
const sTickList: TickCallbacks[] = [];

function sleepTicks(tickCount: number) {
  return new Promise((resolve) => sTickList.push({ remainingTicks: tickCount, callback: resolve }));
}

// Run tick list
server.system.run((e) => {
  const runTask = () => {
    for (let index = 0; index < sTickList.length; ) {
      const currentTickable = sTickList[index];
      currentTickable.remainingTicks -= 1;

      if (currentTickable.remainingTicks <= 0) {
        currentTickable.callback();
        sTickList = sTickList.splice(index, 1);
      } else {
        ++index;
      }
    }
    server.system.run(runTask);
  };
  runTask();
});

server.world.events.playerSpawn.subscribe(async (e: server.PlayerSpawnEvent) => {
  const player = e.player;
  if (e.initialSpawn) {
    await sleepTicks(100);
    player.tell("Hi bob!");
  }
});

server.world.events.blockBreak.subscribe((e) => {
  console.warn("=== MOTD Break! ===");
  const player = e.player;
  player.tell("Hi bob!");
});
