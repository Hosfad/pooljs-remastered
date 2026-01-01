import type { BallType, KeyPositions } from "../common/pool-types";
import { PoolService } from "./pool-service";
import { Events, Service } from "./service";

export class LocalService extends Service {
    protected service: PoolService;

    constructor(service: PoolService) {
        super();
        this.service = service;
    }

    override connect(): Promise<boolean> {
        return new Promise((resolve) => {
            this.send(Events.INIT, undefined);
            resolve(true);
        });
    }

    override winner(): boolean {
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
        this.send(Events.PULL, { x, y, angle });
    }

    override hitBalls(powerPercent: number, angle: number): KeyPositions {
        const keyPositions = this.service.hitBalls(powerPercent, angle);
        this.send(Events.HITS, { keyPositions, state: this.service.getState() });
        return keyPositions;
    }
}
