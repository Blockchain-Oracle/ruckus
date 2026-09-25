import { type Client, Room, ServerError } from 'colyseus';

import { type HelloJoinOptions, HelloPlayer, HelloState } from '@arena/protocol/hello';
import { PROTOCOL_VERSION } from '@arena/shared';

const MAX_NAME_LENGTH = 16;
const PROTOCOL_MISMATCH = 4000;

export class HelloRoom extends Room<{ state: InstanceType<typeof HelloState> }> {
  override maxClients = 16;
  override state = new HelloState();

  override onCreate(): void {
    this.state.protocolVersion = PROTOCOL_VERSION;
  }

  override onAuth(_client: Client, options: HelloJoinOptions): boolean {
    if (options.protocolVersion !== PROTOCOL_VERSION) {
      throw new ServerError(PROTOCOL_MISMATCH, 'Client protocol is out of date — reload the page.');
    }
    return true;
  }

  override onJoin(client: Client, options: HelloJoinOptions): void {
    const player = new HelloPlayer();
    player.name = (options.name ?? 'guest').slice(0, MAX_NAME_LENGTH);
    player.joinedAt = Date.now();
    this.state.players.set(client.sessionId, player);
  }

  override onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
  }
}
