import * as Phaser from "phaser";

import { v4 as uuid } from "uuid";
import type { BallType, GameSettings, KeyPositions } from "../common/pool-types";
import type { EventsData } from "../common/server-types";
import type { Player, Room } from "../server";

export abstract class Service {
    private events = new Phaser.Events.EventEmitter();
    protected room: Room | null = null;

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

    public me(): { userId: string; name: string } | undefined {
        const { userId } = this.getConfig();
        return userId ? { userId, name: this.getStorage().name } : undefined;
    }

    public getRoomId(): string | null {
        const url = new URL(window.location.href);
        const roomId = url.searchParams.get("room");
        return roomId;
    }

    public instanciateRoom(room: Room) {
        this.room = room;
    }
    public getConfig() {
        return { roomId: this.getRoomId(), ...this.getStorage() };
    }
    public getStorage(): { userId: string; name: string } {
        let user = sessionStorage.getItem("user");

        if (!user) {
            const newUser = { userId: uuid(), name: this.generateRandomName() };
            sessionStorage.setItem("user", JSON.stringify(newUser));
            return newUser;
        }
        const parsed = JSON.parse(user) as { userId: string; name: string };
        return parsed;
    }

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
    public getCurrentRoom(): Room | null {
        return this.room;
    }

    public setSettings(newData: Partial<GameSettings>) {
        const settings = this.getSettings();
        const newSettings = { ...settings, ...newData };
        console.log("Setting settings", newSettings);
        localStorage.setItem("settings", JSON.stringify(newSettings));
    }

    private generateRandomName() {
        const prefixes = [
            "Eldrin",
            "Morwen",
            "Alistair",
            "Lyra",
            "Valerius",
            "Seraphina",
            "Zephyrus",
            "Isolde",
            "Theron",
            "Morgana",
        ] as const;

        const suffixes = [
            "hammer",
            "blade",
            "fire",
            "shadow",
            "stone",
            "heart",
            "bane",
            "wind",
            "mourn",
            "fury",
            "ward",
            "weaver",
            "caller",
            "walker",
            "speaker",
        ] as const;

        const pre = Math.floor(Math.random() * prefixes.length);
        const suf = Math.floor(Math.random() * suffixes.length);
        return `${prefixes[pre]} ${suffixes[suf]}`;
    }

    abstract timerStart(): void;

    abstract timerLeft(): number;

    abstract timerStop(): void;
}
