import type { BallType, KeyPositions } from "../common/pool-types";
import { Events } from "../common/server-types";
import type { Player, Room } from "../server";
import { PoolService } from "./pool-service";
import { Service } from "./service";

const LOCAL_USER_ID = "1";

export class LocalService extends Service {
    protected service: PoolService;
    protected room: Room | null = null;

    constructor(service: PoolService) {
        super();
        this.service = service;
    }

    override connect(): Promise<boolean> {
        this.room = {
            id: LOCAL_USER_ID,
            currentRound: { round: 0, startTime: Date.now(), userId: LOCAL_USER_ID },
            timestamp: Date.now(),
            hostId: LOCAL_USER_ID,
            players: [
                {
                    id: LOCAL_USER_ID,
                    name: "Player 1",
                    roomId: LOCAL_USER_ID,
                    photo: "player-1-avatar.jpg",
                    state: {
                        ballType: "yellow",
                        eqippedCue: "basic",
                    },
                    isSpectator: false,
                },
            ],
        };

        return new Promise((resolve) => {
            this.send(Events.INIT, this.room!);
            resolve(true);
        });
    }

    public override getPlayers(): Player[] {
        return this.room?.players ?? [];
    }

    override winner(): string | undefined {
        return this.service.winner();
    }

    override whoseTurn(): BallType {
        return this.service.whoseTurn();
    }

    override isMyTurn(): boolean {
        return !this.service.winner();
    }

    override setState(state: any): void {
        this.service.setState(state);
    }

    override getState() {
        return this.service.getState();
    }

    override pull(x: number, y: number, angle: number): void {
        this.send(Events.PULL, { x, y, angle, userId: LOCAL_USER_ID, roomId: LOCAL_USER_ID });
    }

    override hitBalls(powerPercent: number, angle: number): KeyPositions {
        const keyPositions = this.service.hitBalls(powerPercent, angle);
        this.send(Events.HITS, {
            keyPositions,
            state: this.service.getState(),
            userId: LOCAL_USER_ID,
            roomId: LOCAL_USER_ID,
        });
        return keyPositions;
    }
}
