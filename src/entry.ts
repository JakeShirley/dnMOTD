import * as server from "@minecraft/server";
import sleep from "./sleep.js";

const dnAdminTag = "dnadmin";
const dnCommandPrefix = "!dn";

const dnMotdPropertyKey = "dnmotd";
const dnMotdPropertyTimeZoneKey = "dnmotdtz";
const dnMotdPropertyDateTimeLangKey = "dnmotdlang";

const dnDynamicProperties = {
  [dnMotdPropertyTimeZoneKey]: 30,
  [dnMotdPropertyDateTimeLangKey]: 5,
  [dnMotdPropertyKey]: 255,
};

function debugInfo(message: string) {
  console.warn(`[dnINFO] ${message}`);
}
function debugWarning(message: string) {
  console.warn(`[dnWARN] ${message}`);
}
function debugError(message: string) {
  console.error(`[dnERROR] ${message}`);
}

type dnCommandCallback = (player: server.Player, command: string) => boolean;

const dnCommands: { [key: string]: dnCommandCallback } = {
  setmotd: function (player: server.Player, command: string): boolean {
    server.world.setDynamicProperty(dnMotdPropertyKey, command);

    player.sendMessage(`Set MOTD to:\n${command}`);
    return true;
  },
  setmotdtz: function (player: server.Player, command: string): boolean {
    server.world.setDynamicProperty(dnMotdPropertyTimeZoneKey, command);

    player.sendMessage(`Set MOTD time sone to:\n${command}`);
    return true;
  },
};

type MessageFormatterCallback = (player: server.Player, message: string) => string;
interface MOTDFormatter {
  name: string;
  example: string;
  regex: RegExp | string;
  format: MessageFormatterCallback;
}

const dnMotdFormatStrings: MOTDFormatter[] = [
  {
    name: "New Line",
    example: "\\n",
    regex: "\\n",
    format: function (player: server.Player, matchString: string) {
      return "\n";
    },
  },
  {
    name: "Tab",
    example: "\\t",
    regex: "\\t",
    format: function (player: server.Player, matchString: string) {
      return "  ";
    },
  },

  {
    name: "Player Name",
    example: "#pn#",
    regex: new RegExp("#pn#"),
    format: function (player: server.Player, matchString: string) {
      return player.name;
    },
  },
  {
    name: "Player Name Tag",
    example: "#pnt#",
    regex: new RegExp("#pnt#"),
    format: function (player: server.Player, matchString: string) {
      return player.nameTag;
    },
  },
  {
    name: "Minecraft Time of Day (Ticks)",
    example: "#mctimetick#",
    regex: new RegExp("#mctimetick#"),
    format: function (player: server.Player, matchString: string) {
      return `${server.world.getAbsoluteTime()}`;
    },
  },
  {
    name: "Minecraft Time of Day (Time)",
    example: "#mctimestr#",
    regex: new RegExp("#mctimestr#"),
    format: function (player: server.Player, matchString: string) {
      const tick = server.world.getTimeOfDay();
      const hour = (Math.floor(tick / 1000) + 8) % 24;
      const minute = Math.floor(((tick % 1000) / 1000) * 60);
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    },
  },
  {
    name: "Date (Default Format)",
    example: "#date#",
    regex: new RegExp("#date#"),
    format: function (player: server.Player, matchString: string) {
      return new Date().toLocaleDateString();
    },
  },
  {
    name: "Time (Default Format)",
    example: "#time#",
    regex: new RegExp("#time#"),
    format: function (player: server.Player, matchString: string) {
      return new Date().toLocaleTimeString();
    },
  },
  {
    name: "Date Time (Default Format)",
    example: "#datetime#",
    regex: new RegExp("#datetime#"),
    format: function (player: server.Player, matchString: string) {
      const lang: string = (server.world.getDynamicProperty(dnMotdPropertyDateTimeLangKey) as string) ?? "en-US";
      const tz: string = (server.world.getDynamicProperty(dnMotdPropertyTimeZoneKey) as string) ?? "UTC";
      return new Date().toLocaleString(lang, { timeZone: tz });
    },
  },
];

function generateMOTD(player: server.Player, message: string) {
  let resultMessage = message;

  let changesDetected = true;
  while (changesDetected) {
    changesDetected = false;
    for (let formatter of dnMotdFormatStrings) {
      const newResultMessage = resultMessage.replace(formatter.regex, function (match: string) {
        const result = formatter.format(player, match);

        debugInfo(`Formatter '${formatter.name}': '${match}' => '${result}'`);

        return result;
      });

      // Keep going as long as there are changes
      changesDetected = changesDetected || newResultMessage != resultMessage;
      resultMessage = newResultMessage;
    }
  }

  return resultMessage;
}

server.world.afterEvents.worldInitialize.subscribe((e) => {
  const propertyDefs = new server.DynamicPropertiesDefinition();

  for (const dynamicProperty of Object.keys(dnDynamicProperties)) {
    propertyDefs.defineString(dynamicProperty, dnDynamicProperties[dynamicProperty]);
  }

  e.propertyRegistry.registerWorldDynamicProperties(propertyDefs);
});

server.world.afterEvents.playerSpawn.subscribe((e: server.PlayerSpawnAfterEvent) => {
  const player = e.player;
  if (e.initialSpawn) {
    const motdMessage = server.world.getDynamicProperty(dnMotdPropertyKey);
    const motd = generateMOTD(player, motdMessage as string);
    player.sendMessage(motd);
  }
});

server.world.afterEvents.blockBreak.subscribe((e) => {
  const player = e.player;
  player.nameTag = player.name;
  const motdMessage = server.world.getDynamicProperty(dnMotdPropertyKey);
  const motd = generateMOTD(player, motdMessage as string);
  player.sendMessage(motd);
});

server.world.beforeEvents.chatSend.subscribe((e) => {
  const player = e.sender;
  const message = e.message;

  if (!player.hasTag(dnAdminTag)) {
    return;
  }

  if (!message.startsWith(dnCommandPrefix)) {
    return;
  }

  const parsedCommand = message.slice(dnCommandPrefix.length).trim();
  e.cancel = true;

  for (let dnCommand of Object.keys(dnCommands)) {
    const commandCallback = dnCommands[dnCommand];

    if (parsedCommand.startsWith(dnCommand)) {
      const subCommandStr = parsedCommand.slice(dnCommand.length).trim();
      e.cancel = commandCallback(player, subCommandStr);
    }
  }
});
