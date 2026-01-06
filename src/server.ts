import express from "express";
import { v4 as uuid } from "uuid";
import WebSocket, { WebSocketServer } from "ws";
import type { BallType } from "./common/pool-types";
import {
    Events,
    type EventsData,
    type Middleware,
    type MiddlewareInput,
    type PoolState,
    type RoomEventBodyOptions,
    type TEventKey,
    type TEventListener,
} from "./common/server-types";

const MAX_PLAYERS_PER_ROOM = 2;

type ServerRoom = {
    id: string;
    clients: Client[];
    state?: PoolState;
    winner?: string;
    hostId: string;
    timestamp: number;
    isMatchMaking: boolean;
    kickedPlayers?: string[];
};

type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type Room = Prettify<Omit<ServerRoom, "clients"> & { players: Player[] }>;

export type Client = {
    id: string;
    name: string;
    photo: string;
    roomId: string;
    isSpectator: boolean;
    state: { ballType: BallType };
    ws: WebSocket;
    disconnectedAt?: number;
};

export type Player = Omit<Client, "ws">;

const app = express();
const server = app.listen(6969, () => {
    console.log("Multiplayer server running on :6969", process.cwd());
});

const wss = new WebSocketServer({ server });

const rooms: Record<string, ServerRoom> = {};

const NUM_AVATARS = 6;

wss.on("connection", (ws) => {
    let client: Client | null = null;

    const eventListener = createEventListener(ws);
    const withRoomAuthMiddleware = roomAuthMiddleware();

    eventListener.on(Events.JOIN_ROOM, (data) => {
        const { roomId, userId: senderId, name } = data;
        const room = roomId ? getRoom(roomId) : null;

        if (!room) {
            const finalId = roomId ?? uuid();
            const newRoom = createNewRoom({ userId: senderId, name }, ws, finalId);
            sendEvent(ws, Events.JOIN_ROOM_RESPONSE, {
                type: "success",
                data: reshapeRoom(newRoom),
            });
            return;
        }

        if (room.isMatchMaking) {
            return sendEvent(ws, Events.JOIN_ROOM_RESPONSE, {
                type: "error",
                message: "Match making is already in progress",
                code: "match-making-in-progress",
            });
        }

        if (room.kickedPlayers?.includes(senderId)) {
            return sendEvent(ws, Events.JOIN_ROOM_RESPONSE, {
                type: "error",
                message: "You were kicked from the lobby",
                code: "kicked-from-lobby",
            });
        }

        const isSpectator = room.clients.length >= MAX_PLAYERS_PER_ROOM;

        // Update existing client (Should close the old ws connection here)
        const existingClient = room.clients.find((c) => c.id === senderId);
        if (existingClient) {
            room.clients = room.clients.filter((c) => c.id !== senderId);
        }

        room.clients.push({
            id: senderId,
            name,
            ws,
            photo: `/assets/avatars/${Math.floor(Math.random() * NUM_AVATARS)}.png`,
            roomId: room.id,
            state: {
                ballType: room.clients.length % 2 === 0 ? "yellow" : "red",
            },
            isSpectator,
        });

        rooms[room.id] = room;

        broadcastEvent({ roomId: room.id, senderId: senderId! }, Events.JOIN_ROOM_RESPONSE, {
            type: "success",
            data: reshapeRoom(room),
        });
    });

    eventListener.on(Events.MATCH_MAKE_START, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        // Room not found
        if (!room)
            return sendEvent(ws, Events.MATCH_MAKE_START_RESPONSE, {
                type: "error",
                message: "Room not found (match make start)",
                code: "room-not-found",
            });

        // Room is full
        if (room.clients.length === 2)
            return sendEvent(ws, Events.MATCH_MAKE_START_RESPONSE, {
                type: "error",
                message: "Room is full (match make start). Please wait for the current match to end",
                code: "room-full-match-in-progress",
            });

        room.isMatchMaking = true;
        sendEvent(ws, Events.MATCH_MAKE_START_RESPONSE, { type: "success", data: { roomId: room.id } });
    });

    eventListener.on(Events.MATCH_MAKE_CANCEL, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return console.error("Room not found (match make cancel)", roomId);
        if (room.clients.length === 2) return console.error("Match already found (match make cancel)", roomId);

        room.isMatchMaking = false;
        sendEvent(ws, Events.MATCH_MAKE_CANCEL_RESPONSE, { type: "success", data: { roomId: room.id } });
    });

    eventListener.on(Events.KICK_PLAYER, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId, kickTargetId } = data;
        const room = getRoom(roomId);
        if (!room) return console.error("Room not found (kick player)", roomId);
        if (room.hostId !== senderId) return console.error("Only the host can kick players", roomId);
        if (room.clients.length < 2) return console.error("Cannot kick player your self", roomId);

        const client = room.clients.find((c) => c.id === kickTargetId);
        if (!client) return console.error("Client not found", roomId);
        broadcastEvent(
            {
                roomId,
                senderId,
            },
            Events.KICK_PLAYER,
            {
                type: "success",
                roomId,
                userId: senderId,
                kickTargetId,
            }
        );
        room.clients = room.clients.filter((c) => c.id !== kickTargetId);
        room.kickedPlayers = room.kickedPlayers ?? [];
        room.kickedPlayers.push(kickTargetId);
        client.ws.close();
        rooms[room.id] = room;
    });

    eventListener.on(Events.PLAYER_DISCONNECT, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return;
        const client = room.clients.find((c) => c.id === senderId);
        if (!client) return;
        client.disconnectedAt = Date.now();

        broadcastEvent({ roomId: room.id, senderId: senderId! }, Events.PLAYER_DISCONNECT, {
            roomId: room.id,
            userId: senderId,
            type: "success",
        });
    });

    eventListener.on(Events.START_GAME, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);

        if (!room) return;

        broadcastEvent({ roomId: room.id, senderId: senderId! }, Events.INIT, {
            type: "success",
            ...reshapeRoom(room),
        });
    });

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

    const room: ServerRoom = {
        id: finalId,
        clients: [] as Client[],
        timestamp: Date.now(),
        hostId: userId,
        isMatchMaking: false,
    };

    const client: Client = {
        id: userId,
        name: username,
        photo: `/assets/avatars/${Math.floor(Math.random() * 6)}.png`,
        ws,
        roomId: finalId,
        state: {
            ballType: room.clients.length % 2 === 0 ? "solid" : "striped",
        },
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

function getRoom(roomId: string) {
    if (!roomId) return null;

    const room = rooms[roomId];

    if (!room) {
        console.error("Room not found", roomId);
        return null;
    }
    const filteredClients = room.clients.filter((c) => c.ws.readyState === WebSocket.OPEN);

    return { ...room, clients: filteredClients };
}

function reshapeRoom(room: ServerRoom): Room {
    const players = room.clients.map((c) => {
        return reshapePlayer(c);
    });
    return {
        ...room,
        players,
    };
}
function reshapePlayer(c: Client) {
    const newC = { ...c, ws: undefined };
    delete newC.ws;
    const player: Player = {
        ...newC,
    };
    return player;
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
