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
  /** false = ghost (killed or voted out) */
  @type('boolean') alive = true;
  /** a body lies where this player was killed (until the next meeting) */
  @type('boolean') body = false;
  @type('float64') bodyX = 0;
  @type('float64') bodyY = 0;
}

export class GameState extends Schema {
  @type('string') code = '';
  @type('string') mapSlug = 'co-do-hue';
  @type('uint8') mapVersion = 2;
  @type('string') hostId = '';
  /** public (default) = findable via quick-match; private = only joinable with the room code */
  @type('boolean') isPublic = true;
  @type('string') phase = 'lobby';
  @type('number') phaseEndsAt = 0;
  @type('uint16') progress = 0;
  @type('uint16') progressTarget = 6;
  @type('string') meetingReason = '';
  /** night clock (5 canh): elapsed = (nightPausedAt || now) - nightStartAt; 0 = not running */
  @type('float64') nightStartAt = 0;
  /** non-zero while the clock is paused (meetings) */
  @type('float64') nightPausedAt = 0;
  /** 0 = auto */
  @type('uint8') killers = 0;
  @type('uint8') tasksPerPlayer = 4;
  /** whole-night length in minutes; recomputed from players/killers/tasks while nightAuto */
  @type('uint8') nightMin = 5;
  @type('boolean') nightAuto = true;
  /** living players per faction — counts only, never who */
  @type('uint8') crewAlive = 0;
  @type('uint8') killersAlive = 0;
  /** running sabotage ('' | 'blind' | 'ward'), when it ends, and the ward's area + spot */
  @type('string') sabotage = '';
  @type('float64') sabotageEndsAt = 0;
  @type('string') sabotageArea = '';
  @type('float64') sabotageX = 0;
  @type('float64') sabotageY = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
}
