import { insertCoin, isHost, me, onPlayerJoin, RPC } from "playroomkit";
import type { KeyPositions, Player } from "../common/pool-types";
import { LocalService } from "./local-service";
import { Events } from "./service";

export class MultiplayerService extends LocalService {
    private players: { [key: string]: Player } = {};

    override async connect(): Promise<boolean> {
        try {
            this.registerEvents();
            await insertCoin(
                {
                    maxPlayersPerRoom: 2,
                    defaultPlayerStates: { ballType: "white" } as Player,
                },
                () => {
                    if (!isHost()) return;

                    const ballTypes = ["red", "yellow"];

                    const players = Object.values(this.players);
                    players.forEach((player, i) => {
                        player.setState("ballType", ballTypes[i]);
                    });

                    const data = players.map((p) =>
                        ({ ...p.getProfile(), ...p, ballType: p.getState("ballType") })
                    );

                    RPC.call(Events.INIT, { players: data }, RPC.Mode.ALL);
                }
            );
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    override isMyTurn(): boolean {
        return this.service.whoseTurn() === me()?.getState("ballType");
    }

    override hitBalls(powerPercent: number, angle: number): KeyPositions {
        const keyPositions = this.service.hitBalls(powerPercent, angle);
        RPC.call(Events.HITS, { keyPositions: keyPositions, state: this.service.getState() }, RPC.Mode.ALL);
        return keyPositions;
    }

    override pull(x: number, y: number, angle: number): void {
        RPC.call(Events.PULL, { x, y, angle }, RPC.Mode.ALL);
    }

    registerEvents() {
        RPC.register(Events.INIT, async (data) => {
            this.send(Events.INIT, data);
        });

        RPC.register(Events.PULL, async (data) => {
            this.send(Events.PULL, data);
        });

        RPC.register(Events.HITS, async (data) => {
            this.send(Events.HITS, data);
        });

        onPlayerJoin((player) => {
            this.players[player.id] = player as Player;
            player.onQuit(() => {
                delete this.players[player.id];
            });
        });
    }
}
