import * as Phaser from "phaser";
import type { BallType, KeyPositions } from "../common/pool-types";
import type { PoolState } from "./pool-service";
import type { PlayerProfile } from "playroomkit";

export enum Events {
    INIT = "game-start",
    ENDS = "game-end",
    PULL = "pull",
    HITS = "hit",
}

export interface EventsData {
    [Events.HITS]: { keyPositions: KeyPositions; state: PoolState };
    [Events.PULL]: { x: number; y: number; angle: number };
    [Events.INIT]: { players: (PlayerProfile & { ballType: BallType })[]; };
}

export abstract class Service {
    private events = new Phaser.Events.EventEmitter();

    public subscribe<T extends keyof EventsData>(event: T, callback: (data: EventsData[T]) => void) {
        this.events.on(event, callback);
    }

    public send<T extends keyof EventsData>(event: T, data: EventsData[T]) {
        this.events.emit(event, data);
    }

    abstract winner(): string | undefined;
    abstract whoseTurn(): BallType;
    abstract isMyTurn(): boolean;

    abstract hitBalls(powerPercent: number, angle: number): KeyPositions;
    abstract connect(): Promise<boolean>;
    // abstract disconnect(): void;

    abstract setState(state: any): void;
    abstract getState(): any;

    abstract pull(x: number, y: number, angle: number): void;
}
