import express from "express";
import { v4 as uuid } from "uuid";
import WebSocket, { WebSocketServer } from "ws";
import type { BallType, CueId } from "./common/pool-types";
import {
    Events,
    type EventsData,
    type Middleware,
    type MiddlewareInput,
    type RoomEventBodyOptions,
    type TEventKey,
    type TEventListener,
    type WebsocketError,
    type WebsocketRespone,
} from "./common/server-types";

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

    eventListener.on(Events.CREATE_ROOM, [], (input) => {
        const { userId, name } = input;
        if (!userId) return sendError(ws, Events.CREATE_ROOM, "User ID is required");
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
            name,
            ws,
            roomId,
            isHost: true,
            state: {},
            isSpectator: false,
        };
        room.clients.push(client);
        sendEvent(client.ws, Events.CREATE_ROOM_RESPONSE, { type: "success", data: { roomId } });
    });

    // Broadcast events
    eventListener.on(Events.JOIN_ROOM, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId, name } = data;
        console.log("Joining room", roomId, senderId, name);
        const room = getRoom(roomId);
        if (!room) return sendError(ws, Events.JOIN_ROOM, "Room not found");

        if (room.clients.length >= MAX_ROOM_SIZE) {
            return sendError(ws, Events.ERROR_ROOM_FULL, "This room is full");
        }

        const isSpectator = room.clients.length >= MAX_PLAYERS_PER_ROOM;

        const existingClient = room.clients.find((c) => c.id === senderId);

        if (existingClient && ws.readyState !== WebSocket.OPEN) {
            existingClient.ws = ws;
        }

        if (!existingClient) {
            room.clients.push({
                id: senderId,
                name,
                ws,
                roomId,
                isHost: false,
                state: {},
                isSpectator,
            });
        }

        brodcastEvent({ roomId: room.id, senderId: senderId! }, Events.JOIN_ROOM_RESPONSE, {
            type: "success",
            data: {
                type: "success",
                data: room,
            },
        });
    });

    eventListener.on(Events.PULL, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return;
        brodcastEvent({ roomId: room.id, senderId: senderId! }, Events.PULL, { type: "success", data });
    });

    eventListener.on(Events.HITS, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return;
        // update the game state
        brodcastEvent({ roomId: room.id, senderId: senderId! }, Events.HITS, { type: "success", data });
    });

    ws.on("close", () => {
        if (!client) return;
    });
});

const withRoomAuthMiddleware: Middleware<RoomEventBodyOptions> = (data) => {
    const { roomId, userId } = data;

    if (!roomId) return { error: "Room ID is required" };
    if (!userId) return { error: "User ID is required" };

    const room = getRoom(roomId);

    if (!room) return { error: "Room not found" };
    if (room.clients.find((c) => c.id === userId)) return { error: "User already in room" };

    return { success: true };
};

function brodcastEvent<T extends TEventKey>(
    options: { roomId: string; senderId: string },
    event: T,
    body: WebsocketRespone<EventsData[T]>
) {
    const { roomId, senderId } = options;
    const room = getRoom(roomId);
    if (!room) return;
    const clients = room.clients.filter((c) => c.id !== senderId);
    const resObj = body.type === "success" ? (body.data as EventsData[T]) : (body as unknown as WebsocketError).error;

    const sendThisShit = body.type === "success" ? sendEvent : sendError;
    clients.forEach((c) => sendThisShit(c.ws, event, resObj as any));
}

function getRoom(roomId?: string) {
    if (!roomId) return null;

    if (!rooms[roomId]) {
        console.error("Room not found", roomId);
        return null;
    }

    const room = rooms[roomId];
    const filteredClients = room.clients.filter((c) => c.ws.readyState === WebSocket.OPEN);

    return { ...room, clients: filteredClients };
}

function createEventListener(ws: WebSocket): TEventListener {
    type EventListeners<T extends TEventKey> = {
        middlewares: Middleware<EventsData[T]>[];
        handler: (data: EventsData[T]) => void;
    };

    const listeners: {
        [K in TEventKey]?: EventListeners<K>[];
    } = {} as any;

    function parseRawMessage(raw: string) {
        try {
            const parsed = JSON.parse(raw) as {
                event: TEventKey;
                data: EventsData[TEventKey];
            };

            return reshapeData(parsed.event, parsed.data);
        } catch (error) {
            console.error("Error parsing raw message", raw);
            return null;
        }
    }
    function reshapeData<T extends TEventKey>(event: T, data: EventsData[T]) {
        return { event, data } as {
            event: T;
            data: EventsData[T];
        };
    }

    ws.on("message", async (raw) => {
        const parsed = parseRawMessage(raw.toString());
        if (!parsed) return;
        const { event, data } = parsed;
        if (!event) return;

        let eventListeners = listeners[event];
        if (!eventListeners) return console.warn("No event listeners found for", event);

        for (const listener of eventListeners) {
            const middlewaresPromises = listener.middlewares.map((mw) => mw(data as any));
            for (const promise of middlewaresPromises) {
                const result = await promise;
                if (result.error) {
                    console.error("Error in middleware", result.error);
                    sendError(ws, event, result.error);
                    break;
                }
            }

            listener.handler(data as any);
        }
    });

    return {
        async on<T extends TEventKey>(
            event: T,
            middlewareOrHandler: MiddlewareInput<EventsData[T]> | ((data: EventsData[T]) => void),
            maybeHandler?: (data: EventsData[T]) => void
        ) {
            const eventListeners: EventListeners<T>[] = (listeners[event] ??= []);
            if (!eventListeners) return console.error("Event listeners not found, something fucky must have happened");

            if (maybeHandler !== undefined) {
                // We have middleware(s) and a handler
                const middlewares = Array.isArray(middlewareOrHandler)
                    ? (middlewareOrHandler as Middleware<EventsData[T]>[])
                    : [middlewareOrHandler as Middleware<EventsData[T]>];

                const eventListeners: EventListeners<T>[] = (listeners[event] ??= []);
                eventListeners.push({ middlewares: middlewares, handler: maybeHandler });
            } else {
                const handler = middlewareOrHandler as (data: EventsData[T]) => void;
                eventListeners.push({ middlewares: [], handler });
            }
        },

        send<T extends TEventKey>(event: T, data: EventsData[T]) {
            ws.send(JSON.stringify({ event, data }));
        },
    };
}

function sendEvent<T extends TEventKey>(ws: WebSocket, event: T, data: EventsData[T]) {
    const str = JSON.stringify({ type: "success", event, data });
    ws.send(str);
}

function sendError<T extends TEventKey>(ws: WebSocket, event: T, error: string) {
    const str = JSON.stringify({ event, data: { type: "error", error } });
    console.error("Error event", str);
    ws.send(str);
}
