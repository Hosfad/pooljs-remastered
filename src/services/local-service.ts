import type { BallType, KeyPositions } from "../common/pool-types";
import { Events } from "../common/server-types";
import { PoolService } from "./pool-service";
import { Service } from "./service";

const LOCAL_USER_ID = "1";

export class LocalService extends Service {
    protected service: PoolService;

    constructor(service: PoolService) {
        super();
        this.service = service;
    }

    override connect(): Promise<boolean> {
        return new Promise((resolve) => {
            this.send(Events.INIT, {
                userId: LOCAL_USER_ID,
                roomId: LOCAL_USER_ID,
                players: [
                    {
                        id: LOCAL_USER_ID,
                        name: "Player 1",
                        photo: "player-1-avatar.jpg",
                        ballType: "yellow",
                    },
                ],
            });
            resolve(true);
        });
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
