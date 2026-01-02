import { v4 as uuid } from "uuid";
import { type KeyPositions } from "../common/pool-types";
import { Events, type EventsData, type TEventKey } from "../common/server-types";
import type { Player, Room } from "../server";
import { LocalService } from "./local-service";

export class MultiplayerService extends LocalService {
    private players: { [key: string]: Player } = {};
    private room: Room | null = null;

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

    override subscribe<T extends keyof EventsData>(event: T, callback: (data: EventsData[T]) => void) {
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

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public me():
        | {
              userId: string;
              name: string;
          }
        | undefined {
        const { userId } = this.getConfig();
        if (!userId) return undefined;
        const localStorage = this.getLocalStorage();

        return {
            userId,
            name: localStorage.name,
        };
    }

    private async insertCoin() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return await this.connect();
        const { userId, roomId, name } = this.getConfig();
        this.send(Events.JOIN_ROOM, { roomId: roomId ?? undefined, userId, name });
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

    public getCurrentRoom(): Room | null {
        return this.room;
    }

    public getRoomId(): string | null {
        const url = new URL(window.location.href);
        const roomId = url.searchParams.get("room");
        return roomId;
    }
    public instanciatePlayers(room: Room) {
        const players = room.players;
        console.log("Instanciating players", players);
        players.forEach((p) => {
            this.players[p.id] = p;
        });
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
        // TODO: Handle errors inseread of logging

        this.subscribe(Events.PULL, (data) => {
            this.send(Events.PULL, data);
        });
        this.subscribe(Events.HITS, (data) => {
            this.send(Events.HITS, data);
        });
    }
}
