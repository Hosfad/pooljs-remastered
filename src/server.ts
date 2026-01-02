import express from "express";
import { v4 as uuid } from "uuid";
import WebSocket, { WebSocketServer } from "ws";
import type { BallType, CueId } from "./common/pool-types";
import { Events, type EventsData, type TEventKey, type TEventListener } from "./common/server-types";

const MAX_ROOM_SIZE = 4;

const MAX_PLAYERS_PER_ROOM = 2;

export type Room = {
    id: string;
    clients: Client[];
    currentRound: {
        round: number;
        startTime: number;
        userId: string;
    };
    timestamp: number;
};

export type Client = {
    id: string;
    name: string;
    roomId: string;
    isHost: boolean;
    isSpectator: boolean;
    state: { ballType?: BallType; eqippedCue?: CueId };
    ws: WebSocket;
};
export type Player = Omit<Client, "ws">;

const app = express();
const server = app.listen(6969, () => console.log("Multiplayer server running on :6969"));

const wss = new WebSocketServer({ server });
const rooms: Record<string, Room> = {};

wss.on("connection", (ws) => {
    let client: Client | null = null;

    const eventListener = createEventListener(ws);

    eventListener.on(Events.CREATE_ROOM, (data) => {
        const { userId } = data;
        if (!userId) return console.error("User ID is required");
        const roomId = uuid();

        // Create room
        const room = (rooms[roomId] = {
            id: roomId,
            clients: [] as Client[],
            currentRound: { round: 0, startTime: Date.now(), userId: userId! },
            timestamp: Date.now(),
        });

        const client: Client = {
            id: userId,
            name: userId,
            ws,
            roomId,
            isHost: true,
            state: {},
            isSpectator: false,
        };
        room.clients.push(client);
        sendEvent(client.ws, Events.CREATE_ROOM_RESPONSE, { roomId });
    });

    // Broadcast events
    eventListener.on(Events.JOIN_ROOM, (data) => {
        const { roomId, userId: senderId, name } = data;
        const room = getRoom(roomId);
        if (!room) return;

        if (room.clients.length >= MAX_ROOM_SIZE) {
            return sendEvent(ws, Events.ERROR_ROOM_FULL, { roomId, error: "This room is full" });
        }

        const isSpectator = room.clients.length >= MAX_PLAYERS_PER_ROOM;

        room.clients.push({
            id: senderId,
            name,
            ws,
            roomId,
            isHost: false,
            state: {},
            isSpectator,
        });

        brodcastEvent({ roomId: room.id, senderId: senderId! }, Events.JOIN_ROOM, data);
    });

    eventListener.on(Events.PULL, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return;
        brodcastEvent({ roomId: room.id, senderId: senderId! }, Events.PULL, data);
    });

    eventListener.on(Events.HITS, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return;
        // update the game state

        brodcastEvent({ roomId: room.id, senderId: senderId! }, Events.HITS, data);
    });

    ws.on("close", () => {
        if (!client) return;
    });
});

function brodcastEvent<T extends TEventKey>(options: { roomId: string; senderId: string }, event: T, data: EventsData[T]) {
    const { roomId, senderId } = options;
    const room = getRoom(roomId);
    if (!room) return;
    const clients = room.clients.filter((c) => c.id !== senderId);
    clients.forEach((c) => sendEvent(c.ws, event, data));
}

function getRoom(roomId?: string) {
    if (!roomId) return null;

    if (!rooms[roomId]) {
        return null;
    }

    const room = rooms[roomId];
    const filteredClients = room.clients.filter((c) => c.ws.readyState === WebSocket.OPEN);

    return { ...room, clients: filteredClients };
}

function createEventListener(ws: WebSocket): TEventListener {
    const listeners: {
        [K in TEventKey]?: Array<(data: EventsData[K]) => void>;
    } = {};

    ws.on("message", (raw) => {
        const rawStr = raw.toString();
        const parsed = JSON.parse(rawStr) as {
            event: TEventKey;
            data: unknown;
        };
        const { event, data } = parsed;
        if (!event) return;
        listeners[event]?.forEach((handler) => handler(data as any));
    });

    return {
        on<T extends TEventKey>(event: T, handler: (data: EventsData[T]) => void) {
            listeners[event] ??= [];
            listeners[event]!.push(handler);
        },

        send<T extends TEventKey>(event: T, data: EventsData[T]) {
            ws.send(JSON.stringify({ event, data }));
        },
    };
}

function sendEvent<T extends TEventKey>(ws: WebSocket, event: T, data: EventsData[T]) {
    const str = JSON.stringify({ event, data });
    ws.send(str);
}
