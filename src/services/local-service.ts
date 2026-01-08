import type { BallType } from "../common/pool-types";
import { Events } from "../common/server-types";
import type { Player } from "../server";
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
        this.room = {
            id: LOCAL_USER_ID,
            timestamp: Date.now(),
            hostId: LOCAL_USER_ID,
            players: [
                {
                    id: LOCAL_USER_ID,
                    name: "Player 1",
                    roomId: LOCAL_USER_ID,
                    photo: "player-1-avatar.jpg",
                    state: {
                        ballType: "striped",
                    },
                    isSpectator: false,
                },
            ],
            isMatchMaking: false,
            isGameStarted: true,
        };

        return new Promise((resolve) => {
            this.send(Events.INIT, this.room!);
            resolve(true);
        });
    }

    override moveHand(x: number, y: number): void {
        this.send(Events.HAND, { x, y, userId: LOCAL_USER_ID, roomId: LOCAL_USER_ID });
    }

    override setInHole(index: number, inHole: boolean): void {
        this.service.setInHole(index, inHole);
    }

    override timerStart(): void {
        this.service.timerStart();
    }

    override timerLeft(): number {
        return this.service.timerLeft();
    }

    override timerStop(): void {
        this.service.timerStop();
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

    override getState(): any {
        return this.service.getState();
    }

    override pull(x: number, y: number, angle: number): void {
        this.send(Events.PULL, { x, y, angle, userId: LOCAL_USER_ID, roomId: LOCAL_USER_ID });
    }

    override hitBalls(powerPercent: number, angle: number) {
        const velocities = this.service.hitBallsMatter(powerPercent, angle);
        this.send(Events.HITS, { powerPercent, angle, userId: LOCAL_USER_ID, roomId: LOCAL_USER_ID });
        return velocities;
    }

    override hitBallsMatter(powerPercent: number, angle: number): void {
        const velocities = this.service.hitBallsMatter(powerPercent, angle);
    }
}
