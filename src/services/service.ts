import * as Phaser from "phaser";

import type { BallType, GameSettings, KeyPositions } from "../common/pool-types";
import type { EventsData } from "../common/server-types";
import type { Player } from "../server";

export abstract class Service {
    private events = new Phaser.Events.EventEmitter();

    abstract connect(): Promise<boolean>;

    public subscribe<T extends keyof EventsData>(event: T, callback: (data: EventsData[T]) => void) {
        this.events.on(event, callback);
    }

    public send<T extends keyof EventsData>(event: T, data: EventsData[T]) {
        this.events.emit(event, data);
    }
    abstract getPlayers(): Player[];
    abstract winner(): string | undefined;
    abstract whoseTurn(): BallType;
    abstract isMyTurn(): boolean;

    abstract hitBalls(powerPercent: number, angle: number): KeyPositions;
    // abstract disconnect(): void;

    abstract setState(state: any): void;
    abstract getState(): any;

    abstract pull(x: number, y: number, angle: number): void;

    public getSettings(): GameSettings {
        const item = localStorage.getItem("settings");
        if (item) {
            return JSON.parse(item) as GameSettings;
        }
        return {
            masterVolume: 100,
            sfxVolume: 100,
            musicVolume: 80,
            selectedCueIndex: 0,
        };
    }

    public setSettings(newData: Partial<GameSettings>) {
        const settings = this.getSettings();
        const newSettings = { ...settings, ...newData };
        console.log("Setting settings", newSettings);
        localStorage.setItem("settings", JSON.stringify(newSettings));
    }
}
