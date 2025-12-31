import type { BallType, KeyPositions } from "../common/pool-types";

export abstract class Service {
    abstract winner(): boolean;
    abstract whoseTurn(): BallType;
    abstract isMyTurn(): boolean;

    abstract hitBalls(powerPercent: number, angle: number): KeyPositions;
    abstract connect(): Promise<boolean>;
    // abstract disconnect(): void;

    abstract setState(state: any): void;
    abstract getState(): any;

    abstract pull(x: number, y: number, angle: number): void;
}
