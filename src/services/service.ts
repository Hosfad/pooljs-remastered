import * as Phaser from "phaser";

import type { BallType, KeyPositions } from "../common/pool-types";
import type { EventsData } from "../common/server-types";

export abstract class Service {
    private events = new Phaser.Events.EventEmitter();

    abstract connect(): Promise<boolean>;

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
    // abstract disconnect(): void;

    abstract setState(state: any): void;
    abstract getState(): any;

    abstract pull(x: number, y: number, angle: number): void;
}
