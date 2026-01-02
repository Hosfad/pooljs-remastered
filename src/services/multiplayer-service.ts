import { v4 as uuid } from "uuid";
import { MyPlayer, type KeyPositions, type Player, type PlayerState } from "../common/pool-types";
import { Events, type EventsData, type TEventKey } from "../common/server-types";
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
        const keyPositions = this.service.hitBalls(powerPercent, angle);
        this.send(Events.HITS, { keyPositions: keyPositions, state: this.service.getState() });
        return keyPositions;
    }

    override pull(x: number, y: number, angle: number): void {
        this.send(Events.PULL, { x, y, angle });
    }

    private async insertCoin() {
        const roomId = this.getRoomId();
        const { userId } = this.getLocalStorage();
        if (!roomId) {
            console.log("Creating room with user ID:", userId);
            this.send(Events.CREATE_ROOM, { userId });
        } else {
            this.instanciatePlayer({
                id: userId,
                name: "Player 1",
                photo: "player-1-avatar.jpg",
                ballType: "yellow",
                isHost: true,
                state: "game-start",
            });
        }
    }
    private getLocalStorage(): {
        userId: string;
    } {
        let userId = localStorage.getItem("userId");
        if (!userId) {
            userId = uuid();
            localStorage.setItem("userId", userId);
        }
        return {
            userId,
        };
    }

    private getRoomId(): string | null {
        const url = new URL(window.location.href);
        const roomId = url.searchParams.get("room");
        return roomId;
    }

    private instanciatePlayer(playerState: PlayerState) {
        const exists = this.players[playerState.id];
        if (exists) {
            return exists;
        }
        const player = new MyPlayer(playerState);
        this.players[player.id] = player;
        return player;
    }

    registerEvents() {
        this.register(Events.CREATE_ROOM_RESPONSE, (data) => {
            const { roomId } = data;
            const url = new URL(window.location.href);
            url.searchParams.set("room", roomId);
            window.history.replaceState({}, "", url.toString());
        });

        this.register(Events.PULL, (data) => {
            this.send(Events.PULL, data);
        });
        this.register(Events.HITS, (data) => {
            this.send(Events.HITS, data);
        });
    }
}
