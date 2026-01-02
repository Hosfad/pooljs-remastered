import type { Player, Room } from "../server";
import { createRoot } from "react-dom/client";
import { v4 as uuid } from "uuid";
import { type BallType, type KeyPositions } from "../common/pool-types";
import { Events, type EventsData, type TEventKey } from "../common/server-types";
import { PoolLobby } from "../scenes/components/react/lobby";
import { LocalService } from "./local-service";
import React from "react";

export class MultiplayerService extends LocalService {
    private ws: WebSocket | null = null;
    private eventHandlers = new Map<keyof EventsData, Set<(data: any) => void>>();

    override async connect(): Promise<boolean> {
        try {
            if (!this.ws) this.ws = new WebSocket("ws://localhost:6969");

            //   Render React
            const reactRoot = document.getElementById("react-root");

            if (reactRoot) {
                const root = createRoot(reactRoot);
                root.render(
                    <React.StrictMode>
                        <PoolLobby service={this} />
                    </React.StrictMode>
                );
            }

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

    public listen<T extends keyof EventsData>(event: T, callback: (data: EventsData[T]) => void) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(callback);
    }

    public call<T extends keyof EventsData>(event: T, data: EventsData[T]) {
        if (!this.ws || !this.ws.OPEN) {
            console.error("WebSocket is not open");
            return;
        }
        this.ws.send(JSON.stringify({ event, data }));
    }

    public override getPlayers(): Player[] {
        return this.room?.players ?? [];
    }

    override isMyTurn(): boolean {
        const me = this.me();
        const myTurn = this.room?.currentRound.userId === me?.userId;
        console.log(this.room, me)
        return myTurn;
    }

    override winner(): string | undefined {
        return this.room?.winner;
    }

    override whoseTurn(): BallType {
        const players = this.room?.players;
        const currentPlayer = players?.find((p) => p.id === this.room?.currentRound.userId);
        return currentPlayer!.state.ballType!;
    }

    override hitBalls(powerPercent: number, angle: number): KeyPositions {
        const { userId, roomId } = this.getConfig();
        if (!roomId) return [];
        const keyPositions = this.service.hitBalls(powerPercent, angle);
        this.call(Events.HITS, { keyPositions: keyPositions, state: this.service.getState(), userId, roomId });
        return keyPositions;
    }

    override pull(x: number, y: number, angle: number): void {
        const { userId, roomId } = this.getConfig();
        if (!roomId) return;

        this.call(Events.PULL, { x, y, angle, userId, roomId });
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public me(): { userId: string; name: string } | undefined {
        const { userId } = this.getConfig();
        if (!userId) return undefined;
        return { userId, name: this.getStorage().name, };
    }

    private async insertCoin() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return await this.connect();
        const { userId, roomId, name } = this.getConfig();
        this.call(Events.JOIN_ROOM, { roomId: roomId ?? undefined, userId, name });
    }

    private getConfig() {
        const storage = this.getStorage();
        return { roomId: this.getRoomId(), ...storage };
    }

    private getStorage(): { userId: string; name: string } {
        let user = sessionStorage.getItem("user");

        if (!user) {
            const newUser = { userId: uuid(), name: this.generateRandomName() };
            sessionStorage.setItem("user", JSON.stringify(newUser));
            return newUser;
        }
        const parsed = JSON.parse(user) as { userId: string; name: string };
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

    public instanciateRoom(room: Room) {
        this.room = room;
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

    registerEvents() {
        // TODO: Handle errors inseread of logging

        this.listen(Events.INIT, (data) => {
            this.send(Events.INIT, data);
        });

        this.listen(Events.PULL, (data) => {
            this.send(Events.PULL, data);
        });

        this.listen(Events.HITS, (data) => {
            this.send(Events.HITS, data);
        });
    }
}
