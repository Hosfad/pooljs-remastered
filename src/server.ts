import express from "express";
import { v4 as uuid } from "uuid";
import WebSocket, { WebSocketServer } from "ws";
import { POOL_ASSETS } from "./common/pool-constants";
import type { BallType, CueId } from "./common/pool-types";
import {
    Events,
    type EventsData,
    type Middleware,
    type MiddlewareInput,
    type RoomEventBodyOptions,
    type TEventKey,
    type TEventListener,
} from "./common/server-types";

const MAX_ROOM_SIZE = 4;

const MAX_PLAYERS_PER_ROOM = 2;

type ServerRoom = {
    id: string;
    clients: Client[];
    currentRound: {
        round: number;
        startTime: number;
        userId: string;
    };
    hostId: string;
    timestamp: number;
};
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export type Room = Prettify<Omit<ServerRoom, "clients"> & { players: Player[] }>;

export type Client = {
    id: string;
    name: string;
    photo: string;
    roomId: string;
    isSpectator: boolean;
    state: { ballType?: BallType; eqippedCue?: CueId };
    ws: WebSocket;
};
export type Player = Omit<Client, "ws">;

const app = express();
const server = app.listen(6969, () => console.log("Multiplayer server running on :6969"));

const wss = new WebSocketServer({ server });
const rooms: Record<string, ServerRoom> = {};

wss.on("connection", (ws) => {
    let client: Client | null = null;

    const eventListener = createEventListener(ws);

    // This only allows existing users through

    // Broadcast events
    // Dont check for existing user for joining
    eventListener.on(Events.JOIN_ROOM, (data) => {
        const { roomId, userId: senderId, name } = data;
        const room = getRoom(roomId);
        if (!room) {
            const finalId = roomId ?? uuid();
            const newRoom = createNewRoom({ userId: senderId, name }, ws, finalId);
            sendEvent(ws, Events.JOIN_ROOM_RESPONSE, {
                type: "success",
                data: reshapeRoom(newRoom),
            });
            return;
        }

        const isSpectator = room.clients.length >= MAX_PLAYERS_PER_ROOM;

        const existingClient = room.clients.find((c) => c.id === senderId);

        if (!existingClient) {
            room.clients.push({
                id: senderId,
                name,
                ws,
                photo: POOL_ASSETS.AVATAR,
                roomId: room.id,
                state: {},
                isSpectator,
            });
            rooms[room.id] = room;
        }

        console.log(
            room.clients.map((c) => {
                return { ...c, ws: c.ws?.readyState };
            })
        );
        broadcastEvent({ roomId: room.id, senderId: senderId! }, Events.JOIN_ROOM_RESPONSE, {
            type: "success",
            data: reshapeRoom(room),
        });
    });

    // make sure there is userId and roomId
    const withRoomAuthMiddleware = roomAuthMiddleware();

    eventListener.on(Events.PULL, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return;
        broadcastEvent({ roomId: room.id, senderId: senderId! }, Events.PULL, { type: "success", ...data });
    });

    eventListener.on(Events.HITS, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId)!;

        broadcastEvent({ roomId: room.id, senderId: senderId! }, Events.HITS, { type: "success", ...data });
    });

    ws.on("close", () => {
        if (!client) return;
    });
});

const createNewRoom = (user: { userId: string; name: string }, ws: WebSocket, roomId?: string | null) => {
    const finalId = roomId ?? uuid();
    const { userId, name: username } = user;
    const room = {
        id: finalId,
        clients: [] as Client[],
        currentRound: { round: 0, startTime: Date.now(), userId: userId! },
        timestamp: Date.now(),
        hostId: userId,
    };

    const client: Client = {
        id: userId,
        name: username,
        photo: POOL_ASSETS.AVATAR,
        ws,
        roomId: finalId,
        state: {},
        isSpectator: false,
    };
    room.clients.push(client);

    rooms[finalId] = room;

    return room;
};

function roomAuthMiddleware<TInput extends RoomEventBodyOptions>(existigUserOnly = true) {
    const middleware: Middleware<TInput> = (data) => {
        const { roomId, userId } = data;
        const room = getRoom(roomId);
        if (existigUserOnly && !room) return { error: "Room not found" };
        if (existigUserOnly && !room?.clients.find((c) => c.id === userId)) return { error: "User not found" };

        return { success: true, data: { yoooo: "yoooo" } };
    };
    return middleware;
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

function reshapeRoom(room: ServerRoom): Room {
    const players = room.clients.map((c) => {
        const newC = { ...c, ws: undefined };
        delete newC.ws;
        const player: Player = {
            ...newC,
        };
        return player;
    });
    return {
        ...room,
        players,
    };
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
                    sendEvent(ws, event, {
                        type: "error",
                        message: result.error,
                        code: "middleware-error",
                    });

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

function sendEvent<T extends TEventKey>(ws: WebSocket, event: T, data: EventsData[T] & { type: "success" | "error" }) {
    const str = JSON.stringify({ type: data.type, event, data });
    ws.send(str);
}

function broadcastEvent<T extends TEventKey>(
    options: { roomId: string; senderId: string },
    event: T,
    body: EventsData[T] & { type: "success" | "error" }
) {
    const { roomId, senderId } = options;
    const room = getRoom(roomId);
    if (!room) return;

    room.clients.forEach((c) => sendEvent(c.ws, event, body));
}
