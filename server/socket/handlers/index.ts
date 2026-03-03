import type { Server, Socket } from "socket.io";
import { registerTournamentHandlers } from "./tournament";
import { registerMatchHandlers } from "./match";
import { registerTeamHandlers } from "./team";
import { registerBracketHandlers } from "./bracket";
import { registerPlayerHandlers } from "./player";
import { registerEventHandlers } from "./event";
import { registerChallengeHandlers } from "./challenge";

export function registerHandlers(io: Server, socket: Socket) {
	registerTournamentHandlers(io, socket);
	registerMatchHandlers(io, socket);
	registerTeamHandlers(io, socket);
	registerBracketHandlers(io, socket);
	registerPlayerHandlers(io, socket);
	registerEventHandlers(io, socket);
	registerChallengeHandlers(io, socket);
}
