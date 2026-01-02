import { v4 as uuid } from "uuid";
import { type KeyPositions } from "../common/pool-types";
import { Events, type EventsData, type TEventKey } from "../common/server-types";
import type { Player } from "../server";
import { LocalService } from "./local-service";

export class MultiplayerService extends LocalService {
    private players: { [key: string]: Player } = {};

    private ws: WebSocket | null = null;

    private eventHandlers = new Map<keyof EventsData, Set<(data: any) => void>>();

    override async connect(): Promise<boolean> {
        try {
            if (!this.ws) this.ws = new WebSocket("ws://localhost:6969");
            this.registerEvents();

            this.ws.onopen = async () => {
                await this.insertCoin();
            };
            this.ws.onmessage = (e) => {
                const rawStr = e.data;
                const parsed = JSON.parse(rawStr) as {
                    event: TEventKey;
                    data: EventsData[TEventKey];
                };
                const { event, data } = parsed;
                if (!event) return;

                this.eventHandlers.get(event)?.forEach((handler) => handler(data));
            };

            this.ws.onclose = () => {
                console.log("WebSocket closed");
            };

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
    private register<T extends keyof EventsData>(event: T, callback: (data: EventsData[T]) => void) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }

        this.eventHandlers.get(event)!.add(callback);
    }

    override send<T extends keyof EventsData>(event: T, data: EventsData[T]) {
        if (!this.ws || !this.ws.OPEN) {
            console.error("WebSocket is not open");
            return;
        }
        this.ws.send(JSON.stringify({ event, data }));
    }

    override isMyTurn(): boolean {
        return false;
    }

    override hitBalls(powerPercent: number, angle: number): KeyPositions {
        const { userId, roomId } = this.getConfig();
        if (!roomId) return [];
        const keyPositions = this.service.hitBalls(powerPercent, angle);
        this.send(Events.HITS, { keyPositions: keyPositions, state: this.service.getState(), userId, roomId });
        return keyPositions;
    }

    override pull(x: number, y: number, angle: number): void {
        const { userId, roomId } = this.getConfig();
        if (!roomId) return;

        this.send(Events.PULL, { x, y, angle, userId, roomId });
    }

    private async insertCoin() {
        const { userId, roomId, name } = this.getConfig();
        if (!roomId) {
            this.send(Events.CREATE_ROOM, { userId, name });
        } else {
            this.send(Events.JOIN_ROOM, { roomId, userId, name });
        }
    }

    private getConfig() {
        const localStorage = this.getLocalStorage();
        return {
            roomId: this.getRoomId(),
            ...localStorage,
        };
    }

    private getLocalStorage(): {
        userId: string;
        name: string;
    } {
        let user = localStorage.getItem("user");

        if (!user) {
            const newUser = {
                userId: uuid(),
                name: this.generateRandomName(),
            };
            localStorage.setItem("user", JSON.stringify(newUser));
            return newUser;
        }
        const parsed = JSON.parse(user) as {
            userId: string;
            name: string;
        };
        return parsed;
    }

    private getRoomId(): string | null {
        const url = new URL(window.location.href);
        const roomId = url.searchParams.get("room");
        return roomId;
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

        const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${
            suffixes[Math.floor(Math.random() * suffixes.length)]
        }`;

        return name;
    }

    registerEvents() {
        this.register(Events.CREATE_ROOM_RESPONSE, (data) => {
            const { roomId } = data;
            const url = new URL(window.location.href);
            url.searchParams.set("room", roomId);
            window.history.replaceState({}, "", url.toString());
        });

        this.register(Events.JOIN_ROOM_RESPONSE, (data) => {});

        this.register(Events.PULL, (data) => {
            this.send(Events.PULL, data);
        });
        this.register(Events.HITS, (data) => {
            this.send(Events.HITS, data);
        });
    }
}
