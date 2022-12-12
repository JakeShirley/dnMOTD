import * as server from "@minecraft/server";

interface TickCallbacks {
  remainingTicks: number;
  callback: (value: unknown) => void;
}
const sTickList: TickCallbacks[] = [];

// Run tick list
server.system.run(() => {
  const runTask = () => {
    for (let index = 0; index < sTickList.length; ) {
      const currentTickable = sTickList[index];
      currentTickable.remainingTicks -= 1;

      if (currentTickable.remainingTicks <= 0) {
        currentTickable.callback(undefined);
        sTickList.splice(index, 1);
      } else {
        ++index;
      }
    }
    server.system.run(runTask);
  };
  runTask();
});

export default function sleep(tickCount: number) {
  return new Promise((resolve) => sTickList.push({ remainingTicks: tickCount, callback: resolve }));
}
