import * as server from "@minecraft/server";
import sleep from "./sleep";

const dnAdminTag = "dnadmin";
const dnCommandPrefix = "!dn";
const dnMotdPropertyKey = "dnmotd";
const dnMotdMaxLength = 255;

type MessageFormatterCallback = (player: server.Player, message: string, matchedString?: string) => string;
interface MOTDFormatter {
  name: string;
  example: string;
  regex: RegExp;
  format: MessageFormatterCallback;
}

const dnMotdFormatStrings: MOTDFormatter[] = [
  {
    name: "Player Name",
    example: "#pn#",
    regex: new RegExp("#pn#"),
    format: function (player: server.Player, matchString: string) {
      return player.name;
    },
  },
];

function generateMOTD(player: server.Player, message: string) {
  let resultMessage = message;

  for (let formatter of dnMotdFormatStrings) {
    resultMessage.replace(formatter.regex, function (match: string) {
      return formatter.format(player, match);
    });
  }

  return resultMessage;
}

server.world.events.worldInitialize.subscribe((e) => {
  const propertyDefs = new server.DynamicPropertiesDefinition();
  propertyDefs.defineString(dnMotdPropertyKey, dnMotdMaxLength);
  e.propertyRegistry.registerWorldDynamicProperties(propertyDefs);
});

server.world.events.playerSpawn.subscribe(async (e: server.PlayerSpawnEvent) => {
  const player = e.player;
  if (e.initialSpawn) {
    await sleep(50);
    const motdMessage = server.world.getDynamicProperty("dnmotd");
    player.tell(motdMessage as string);
  }
});

server.world.events.blockBreak.subscribe((e) => {
  //console.warn("=== MOTD Break! ===");
  const player = e.player;
  //await sleep(100);
  const motdMessage = server.world.getDynamicProperty("dnmotd");
  const motd = generateMOTD(player, motdMessage as string);
  player.tell(motd);
});

server.world.events.beforeChat.subscribe((e) => {
  const player = e.sender;
  const message = e.message;

  if (!player.hasTag(dnAdminTag)) {
    return;
  }

  if (!message.startsWith(dnCommandPrefix)) {
    return;
  }

  const parsedCommand = message.slice(dnCommandPrefix.length).trim();

  if (parsedCommand.startsWith("setmotd")) {
    const motdMessage = parsedCommand.slice("setmotd".length).trim();
    server.world.setDynamicProperty(dnMotdPropertyKey, motdMessage);

    player.tell(`Set MOTD to:\n${motdMessage}`);
    e.cancel = true;
  }
});
