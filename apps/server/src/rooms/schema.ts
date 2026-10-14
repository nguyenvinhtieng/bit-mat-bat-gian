import { ArraySchema, MapSchema, Schema, type } from '@colyseus/schema';

/** Public, synced state. Secret info (roles, truth, notebooks) is never stored here. */
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
  @type('boolean') emergencyUsed = false;
}

export class SharedClue extends Schema {
  @type('string') id = '';
  @type('string') title = '';
  @type('string') body = '';
  @type('string') source = '';
  @type('string') art = '';
  @type('string') trace = '';
  @type('string') diff = '';
  @type('string') by = '';
}

export class GameState extends Schema {
  @type('string') code = '';
  @type('string') mapSlug = 'co-do-hue';
  @type('uint8') mapVersion = 1;
  @type('string') hostId = '';
  @type('string') phase = 'lobby';
  @type('uint8') round = 0;
  @type('uint8') maxRounds = 2;
  @type('number') phaseEndsAt = 0;
  @type('uint16') progress = 0;
  @type('uint16') progressTarget = 6;
  @type('boolean') finalMeeting = false;
  @type('string') meetingReason = '';
  @type('string') variantChoice = 'random';
  @type('boolean') quick = false;
  @type('string') event = '';
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([SharedClue]) board = new ArraySchema<SharedClue>();
}
