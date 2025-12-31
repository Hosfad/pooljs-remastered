import type { BallType, KeyPositions } from "../common/pool-types";
import { PoolService, type PoolState } from "./pool-service";
import { Service } from "./service";
import * as Phaser from "phaser";

export enum Events {
    INIT = "game-start",
    ENDS = "game-end",
    PULL = "pull",
    HITS = "hit",
}

export interface EventsData {
    [Events.HITS]: { keyPositions: KeyPositions; state: PoolState };
    [Events.PULL]: { x: number; y: number; angle: number };
    [Events.INIT]: void;
}

export class LocalService extends Service {
    private service: PoolService;
    private events = new Phaser.Events.EventEmitter();

    constructor(service: PoolService) {
        super();
        this.service = service;
    }

    public subscribe<T extends keyof EventsData>(event: T, callback: (data: EventsData[T]) => void) {
        this.events.on(event, callback);
    }

    public send<T extends keyof EventsData>(event: T, data: EventsData[T]) {
        this.events.emit(event, data);
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
