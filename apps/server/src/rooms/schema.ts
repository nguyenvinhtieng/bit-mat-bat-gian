import { MapSchema, Schema, type } from '@colyseus/schema';

/** Public, synced state. Secret info (roles, assigned tasks) is never stored here. */
export class Player extends Schema {
  @type('string') id = '';
  @type('string') name = '';
  @type('uint8') color = 0;
  @type('float64') x = 0;
  @type('float64') y = 0;
  @type('uint8') dir = 0;
  @type('boolean') moving = false;
  @type('uint32') lastSeq = 0;
  @type('boolean') ready = false;
  @type('boolean') connected = true;
  @type('uint8') tasksDone = 0;
  @type('boolean') voted = false;
  /** public ballot while a meeting runs: target id, 'skip', or '' (not voted) */
  @type('string') voteFor = '';
  @type('boolean') emergencyUsed = false;
  /** false = spectator (arrested or voted out) */
  @type('boolean') alive = true;
  /** an abandoned CRAB bike lies where this player was arrested (until the next meeting) */
  @type('boolean') body = false;
  @type('float64') bodyX = 0;
  @type('float64') bodyY = 0;
  /** voice chat: microphone switched on */
  @type('boolean') micOn = false;
}

/** One preparation station: how many drivers have it on their list and how many finished it. */
export class StationState extends Schema {
  @type('uint8') need = 0;
  @type('uint8') done = 0;
}

export class GameState extends Schema {
  @type('string') code = '';
  @type('string') mapSlug = 'game';
  @type('uint8') mapVersion = 2;
  @type('string') hostId = '';
  /** public (default) = findable via quick-match; private = only joinable with the room code */
  @type('boolean') isPublic = true;
  @type('string') phase = 'lobby';
  @type('number') phaseEndsAt = 0;
  /** deliveryPreparation: real (driver) prep turns done / total prep turns */
  @type('uint16') progress = 0;
  @type('uint16') progressTarget = 7;
  /** per prep task id */
  @type({ map: StationState }) stations = new MapSchema<StationState>();
  /** handoff_package is unlocked (preparation reached 100%) */
  @type('boolean') handoffOpen = false;
  /** the 50-million package: 'home' (in the warehouse) | 'carried' | 'dropped' | 'delivered' */
  @type('string') packageState = 'home';
  @type('string') packageCarrier = '';
  @type('float64') packageX = 0;
  @type('float64') packageY = 0;
  @type('string') meetingReason = '';
  /** countdown to daybreak: elapsed = (nightPausedAt || now) - nightStartAt; 0 = not running */
  @type('float64') nightStartAt = 0;
  /** non-zero while the clock is paused (meetings) */
  @type('float64') nightPausedAt = 0;
  /** countdown length in minutes (host-adjustable) */
  @type('uint8') nightMin = 8;
  /** prep stations dealt to each player (host-adjustable) */
  @type('uint8') tasksPerPlayer = 3;
  /** living players per faction — counts only, never who */
  @type('uint8') crewAlive = 0;
  @type('uint8') killersAlive = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
}
