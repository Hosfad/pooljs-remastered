import { insertCoin, isHost, me, onPlayerJoin, RPC, type PlayerState } from "playroomkit";
import { Events } from "./service";
import type { BallType, KeyPositions } from "../common/pool-types";
import { LocalService } from "./local-service";

interface Player extends PlayerState {
    ballType: BallType;
}

export class MultiplayerService extends LocalService {
    private players: { [key: string]: Player } = {};

    override async connect(): Promise<boolean> {
        try {
            this.registerEvents();
            await insertCoin({
                maxPlayersPerRoom: 2,
                defaultPlayerStates: { ballType: 'white' } as Player
            }, () => {
                if (!isHost()) return;

                const ballTypes = ['red', 'yellow'];

                Object.values(this.players).forEach((player, i) => {
                    player.setState('ballType', ballTypes[i]);
                });

                // Para firas
                // const images = Object.values(this.players).map(p => p.getProfile().photo);
                RPC.call(Events.INIT, {}, RPC.Mode.ALL);
            });
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    override isMyTurn(): boolean {
        return this.service.whoseTurn() === me()?.getState('ballType');
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
        RPC.register(Events.INIT, async () => {
            this.send(Events.INIT, undefined);
        });

        RPC.register(Events.PULL, async (data) => {
            this.send(Events.PULL, data);
        });

        RPC.register(Events.HITS, async (data) => {
            console.log(data);
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


