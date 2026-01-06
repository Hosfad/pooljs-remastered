import * as Phaser from "phaser";

import type { DiscordSDK } from "@discord/embedded-app-sdk";
import { v4 as uuid } from "uuid";
import { INIT_DISCORD_SDK } from "../common/pool-constants";
import type { BallType, GameSettings, KeyPositions } from "../common/pool-types";
import { Events, type EventsData } from "../common/server-types";
import type { Player, Room } from "../server";

export type LocalUser = {
    id: string;
    name: string;
    photo: string;
    access_token?: string;
};

export abstract class Service {
    private events = new Phaser.Events.EventEmitter();
    protected room: Room | null = null;
    public discordSdk: DiscordSDK | null = null;

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

    public me() {
        const item = sessionStorage.getItem("user");

        if (item) {
            return JSON.parse(item) as { id: string; name: string; photo: string; access_token?: string };
        }
        const user = {
            id: uuid(),
            name: this.generateRandomName(),
            photo: `/assets/avatars/${Math.floor(Math.random() * 6)}.png`,
            access_token: undefined,
        };
        sessionStorage.setItem("user", JSON.stringify(user));
        return user;
    }

    public getRoomConfig() {
        const me = this.me();
        return { roomId: this.getRoomId()!, ...me, userId: me.id };
    }

    public getRoomId(): string | null {
        if (INIT_DISCORD_SDK && this.discordSdk) return this.discordSdk?.instanceId ?? null;
        const url = new URL(window.location.href);
        const roomId = url.searchParams.get("room") as string;
        if (!roomId) {
            const seesionRoomId = sessionStorage.getItem("roomId");
            if (seesionRoomId) {
                return seesionRoomId;
            }
            const id = uuid();
            sessionStorage.setItem("roomId", id);
            return id;
        }
        return roomId;
    }

    public setLocalUser(data: Partial<LocalUser>) {
        const localUser = this.me();
        const newUser = { ...localUser, ...data };
        sessionStorage.setItem("user", JSON.stringify(newUser));
    }

    public instanciateRoom(room: Room) {
        this.room = room;
    }
    public getCurrentRoom(): Room | null {
        return this.room;
    }

    public getSettings(): GameSettings {
        const item = sessionStorage.getItem("settings");
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
        sessionStorage.setItem("settings", JSON.stringify(newSettings));
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

    public showErrorModal(data: { title: string; description?: string; closeAfter?: number }) {
        const { title, description, closeAfter } = data;

        this.send(Events.SHOW_MODAL, { title, description, closeAfter });
    }
}
