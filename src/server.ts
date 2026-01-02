import express from "express";
import { v4 as uuid } from "uuid";
import WebSocket, { WebSocketServer } from "ws";
import type { BallType } from "./common/pool-types";
import { Events, type EventsData, type TEventKey, type TEventListener } from "./common/server-types";

export type Room = {
    id: string;
    clients: Client[];
};
export type Client = {
    id: string;
    ws: WebSocket;
    roomId: string;
    isHost: boolean;
    state: { ballType?: BallType };
};

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
        const room = (rooms[roomId] = { id: roomId, clients: [] as Client[] });
        const client: Client = {
            id: userId,
            ws,
            roomId,
            isHost: true,
            state: {},
        };
        room.clients.push(client);
        sendEvent(client, Events.CREATE_ROOM_RESPONSE, { roomId });
    });

    eventListener.on(Events.JOIN_ROOM, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return;

        room.clients.push({
            id: senderId,
            ws,
            roomId,
            isHost: false,
            state: {},
        });

        brodcastEvent({ roomId: room.id, senderId: senderId! }, Events.JOIN_ROOM, data);
    });

    // TODO : Add middleware for roomId and senderId

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

    room.clients.forEach((c) => sendEvent(c, event, data));
}

function getRoom(roomId?: string) {
    if (!roomId) return null;

    if (!rooms[roomId]) {
        return null;
    }
    return rooms[roomId];
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

function sendEvent<T extends TEventKey>(client: Client, event: T, data: EventsData[T]) {
    const str = JSON.stringify({ event, data });
    console.log("Sending event to client:", client.id, str);
    client.ws.send(str);
}
