import express from "express";
import { v4 as uuid } from "uuid";
import WebSocket, { WebSocketServer } from "ws";
import { Experience } from "./common";
import type { BallType } from "./common/pool-types";
import {
    BroadcastEvent,
    Events,
    type EventsData,
    type Middleware,
    type MiddlewareInput,
    type PoolState,
    type RoomEventBodyOptions,
    type TEventKey,
    type TEventListener,
    type WebsocketError,
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
    isGameStarted: boolean;
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

app.use(express.json());

app.post("/api/token", async (req, res) => {
    const body = req.body;

    const response = await fetch(`https://discord.com/api/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: import.meta.env.VITE_DISCORD_APP_ID as string,
            client_secret: import.meta.env.DISCORD_APP_SECRET as string,
            grant_type: "authorization_code",
            code: req.body.code,
        }),
    });

    const { access_token } = await response.json();
    const me = (await getDiscordOauth2Information(access_token))?.user;

    if (!me) return res.status(400).send("Invalid code");

    const player = {
        id: me.id,
        name: me.username,
        photo: `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}`,
        access_token: access_token,
    };

    console.log("Discord user", player);

    res.send(player);
});

const server = app.listen(6969, () => {
    console.log("Multiplayer server running on :6969", process.cwd());

    console.log("EXP for level 99", Experience.getXpForLevel(100));
});

const wss = new WebSocketServer({ server, path: "/ws" });

const rooms: Record<string, ServerRoom> = {};

setInterval(() => {
    // MATCH MAKING QUEUE
    const matchMakingRooms = Object.values(rooms).filter((r) => r.isMatchMaking);
    if (matchMakingRooms.length === 0) return;

    console.log("Match making queue found", matchMakingRooms.length);
    const groups = matchMakingRooms.reduce((acc, room, i) => {
        if (i % 2 === 0) {
            acc.push([room]);
        } else {
            acc[acc.length - 1]!.push(room);
        }
        return acc;
    }, [] as ServerRoom[][]);

    if (groups.length === 0) return console.log("No match making queue");

    groups.forEach((group) => {
        const combinedRoom = groupRooms(group);
        if (!combinedRoom) return;
    });
}, 1000);

const groupRooms = (rooms: ServerRoom[]) => {
    if (rooms.length < 2) return console.error("Not enough rooms to group");

    const combinedRoom = rooms[0]!;
    const otherRoom = rooms[1]!;

    combinedRoom.clients.push(...otherRoom.clients);
    combinedRoom.isMatchMaking = false;
    combinedRoom.isGameStarted = true;
    delete rooms[otherRoom.id as any];

    rooms[combinedRoom.id as any] = combinedRoom;
    return combinedRoom;
};

wss.on("connection", (ws) => {
    let client: Client | null = null;

    console.log("New connection");

    const eventListener = createEventListener(ws);
    const withRoomAuthMiddleware = roomAuthMiddleware();

    const error = (options: RoomEventBodyOptions, message: string, code: WebsocketError) => {
        return {
            type: "error",
            data: {
                ...options,
                message,
                code,
            },
        } as const;
    };
    function success<TData>(options: RoomEventBodyOptions, data: TData) {
        return {
            type: "success",
            data: {
                ...options,
                ...data,
            },
        } as const;
    }

    eventListener.on(Events.JOIN_ROOM, (data) => {
        const { roomId, senderId, name, photo } = data;
        const room = roomId ? getRoom(roomId) : null;

        if (!room) {
            const newRoom = createNewRoom({ userId: senderId, name, photo }, ws, roomId);
            console.log("New room created", newRoom);
            return respondToEvent(Events.JOIN_ROOM_RESPONSE, success(data, reshapeRoom(newRoom)));
        }

        if (room.isMatchMaking) {
            return respondToEvent(
                Events.JOIN_ROOM_RESPONSE,
                error(data, "Match making is already in progress", "match-making-in-progress")
            );
        }

        if (room.kickedPlayers?.includes(senderId)) {
            return respondToEvent(
                Events.JOIN_ROOM_RESPONSE,
                error(data, "You were kicked from the lobby", "kicked-from-lobby")
            );
        }

        const isSpectator = room.clients.length > MAX_PLAYERS_PER_ROOM;

        // Update existing client (Should close the old ws connection here)
        const existingClient = room.clients.find((c) => c.id === senderId);
        if (existingClient) {
            room.clients = room.clients.filter((c) => c.id !== senderId);
        }
        const existingBallType = room.clients[0]?.state.ballType;
        room.clients.push({
            id: senderId,
            name,
            ws,
            photo: `${photo}`,
            roomId: room.id,
            state: {
                ballType: existingBallType ? (existingBallType === "solid" ? "striped" : "solid") : "solid",
            },
            isSpectator,
        });

        rooms[room.id] = room;

        console.log("Room joined", data.broadcastEvent, room.clients.length);
        const responseObj = success(data, reshapeRoom(room));
        respondToEvent(Events.JOIN_ROOM_RESPONSE, responseObj);
    });

    eventListener.on(Events.MATCH_MAKE_START, withRoomAuthMiddleware, (data) => {
        const { roomId, senderId, broadcastEvent } = data;
        const room = getRoom(roomId);
        // Room not found
        if (!room) return respondToEvent(Events.MATCH_MAKE_START_RESPONSE, error(data, "Room not found", "room-not-found"));

        // Room is full
        if (room.clients.length === 2)
            return respondToEvent(
                Events.MATCH_MAKE_START_RESPONSE,
                error(data, "Room is full", "room-full-match-in-progress")
            );

        room.isMatchMaking = true;
        rooms[room.id] = room;

        respondToEvent(Events.MATCH_MAKE_START_RESPONSE, success(data, reshapeRoom(room)));
    });

    eventListener.on(Events.MATCH_MAKE_CANCEL, withRoomAuthMiddleware, (data) => {
        const { roomId, senderId } = data;
        const room = getRoom(roomId);
        if (!room) return console.error("Room not found (match make cancel)", roomId);
        if (room.clients.length === 2) return console.error("Match already found (match make cancel)", roomId);

        room.isMatchMaking = false;
        respondToEvent(Events.MATCH_MAKE_CANCEL_RESPONSE, success(data, reshapeRoom(room)));
    });

    eventListener.on(Events.KICK_PLAYER, withRoomAuthMiddleware, (data) => {
        const { roomId, senderId, kickTargetId } = data;
        const room = getRoom(roomId);
        if (!room) return console.error("Room not found (kick player)", roomId);
        if (room.hostId !== senderId) return console.error("Only the host can kick players", roomId);
        if (room.clients.length < 2) return console.error("Cannot kick player your self", roomId);

        const client = room.clients.find((c) => c.id === kickTargetId);
        if (!client) return console.error("Client not found", roomId);
        room.clients = room.clients.filter((c) => c.id !== kickTargetId);

        respondToEvent(Events.UPDATE_ROOM, success(data, reshapeRoom(room)));
        room.kickedPlayers = room.kickedPlayers ?? [];
        room.kickedPlayers.push(kickTargetId);
        client.ws.close();
        rooms[room.id] = room;
        console.log("Kicked player", kickTargetId, "from room", room.id);
    });

    eventListener.on(Events.PLAYER_DISCONNECT, withRoomAuthMiddleware, (data) => {
        const { roomId, senderId } = data;
        const room = getRoom(roomId);
        console.log("Player disconnected", senderId, roomId, room);
        if (!room) return;
        const client = room.clients.find((c) => c.id === senderId);
        if (!client) return;
        client.ws.close();

        // Change host/ delete room (if players.length === 0)
        if (room.hostId === senderId) {
            const remainingPlayers = room.clients.filter((c) => c.id !== senderId);
            if (remainingPlayers.length === 0) {
                delete rooms[room.id];
                return;
            }
            room.hostId = remainingPlayers[0]!.id;
        }
        room.isGameStarted = false;
        room.clients = room.clients.filter((c) => c.id !== senderId);
        rooms[room.id] = room;

        respondToEvent(Events.PLAYER_DISCONNECT_RESPONSE, success(data, reshapeRoom(room)));
    });

    eventListener.on(Events.START_GAME, withRoomAuthMiddleware, (data) => {
        const { roomId, senderId } = data;
        const room = getRoom(roomId);

        if (!room) return;
        room.isGameStarted = true;
        rooms[room.id] = room;

        respondToEvent(Events.INIT, success(data, reshapeRoom(room)));
    });

    const gameEvents = [
        Events.PULL,
        Events.HITS,
        Events.HAND,
        Events.DROP_BALL,
        Events.DRAG_POWER_METER,
        Events.POWER_METER_HIT,
    ] as const;

    gameEvents.forEach((event) => {
        eventListener.on(event as TEventKey, withRoomAuthMiddleware, (data) => {
            respondToEvent(event as TEventKey, success(data, data));
        });
    });

    ws.on("close", () => {
        if (!client) return;
    });
});

const createNewRoom = (user: { userId: string; name: string; photo: string }, ws: WebSocket, roomId?: string | null) => {
    const finalId = roomId ?? uuid();

    const { userId, name: username, photo } = user;

    const room: ServerRoom = {
        id: finalId,
        clients: [] as Client[],
        timestamp: Date.now(),
        hostId: userId,
        isMatchMaking: false,
        isGameStarted: false,
    };

    const client: Client = {
        id: userId,
        name: username,
        photo: `${photo}`,
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

function roomAuthMiddleware(existigUserOnly = true) {
    const middleware: Middleware<
        RoomEventBodyOptions & EventsData[TEventKey],
        RoomEventBodyOptions & EventsData[TEventKey]
    > = (data) => {
        const { roomId, senderId } = data;

        console.log("Middleware", { roomId, senderId });
        const room = getRoom(roomId);
        console.log("Middleware room", room?.id);
        if (!room) console.error("Room not found", { rooms });
        if (existigUserOnly && !room) return { error: "Room not found" };
        if (existigUserOnly && !room?.clients.find((c) => c.id === senderId)) return { error: "User not found" };

        return { success: true, data: data };
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
    return { ...room, players };
}
function reshapePlayer(c: Client) {
    const newC = { ...c, ws: undefined };
    delete newC.ws;
    const player: Player = { ...newC };
    return player;
}

function createEventListener(ws: WebSocket): TEventListener {
    type EventListeners<T extends TEventKey, TData = RoomEventBodyOptions & EventsData[T]> = {
        middlewares: Middleware<TData>[];
        handler: (data: TData) => void;
    };

    const listeners: { [K in TEventKey]?: EventListeners<K>[] } = {} as any;

    function parseRawMessage(raw: string) {
        try {
            const parsed = JSON.parse(raw) as {
                event: TEventKey;
                data: EventsData[TEventKey];
                broadcastEvent: BroadcastEvent;
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
                    break;
                }
            }

            listener.handler(data as any);
        }
    });

    return {
        async on<T extends TEventKey, TData extends EventsData[T] & RoomEventBodyOptions>(
            event: T,
            middlewareOrHandler: MiddlewareInput<TData> | ((data: TData) => void),
            maybeHandler?: (data: TData) => void
        ) {
            const eventListeners: EventListeners<T>[] = (listeners[event] ??= []);
            if (!eventListeners) return console.error("Event listeners not found, something fucky must have happened");

            if (maybeHandler !== undefined) {
                // We have middleware(s) and a handler
                const middlewares = Array.isArray(middlewareOrHandler)
                    ? (middlewareOrHandler as Middleware<TData>[])
                    : [middlewareOrHandler as Middleware<TData>];

                const eventListeners: EventListeners<T>[] = (listeners[event] ??= []) as EventListeners<T>[];

                // TODO: as any to make it work, idk why typescript is complaining when i save  EventsData[T] & {broadcastEvent: BroadcastEvent} as TData
                eventListeners.push({ middlewares: middlewares as any, handler: maybeHandler as any });
            } else {
                const handler = middlewareOrHandler as (data: TData) => void;
                eventListeners.push({ middlewares: [], handler: handler as any });
            }
        },
    };
}

function respondToEvent<T extends TEventKey, TResonse extends "success" | "error">(
    event: T,
    body: {
        type: TResonse;
        data: TResonse extends "success"
            ? EventsData[T] & RoomEventBodyOptions
            : { message: string; code: WebsocketError } & RoomEventBodyOptions;
    }
) {
    const { type, data } = body;

    const { broadcastEvent, roomId, senderId } = data;
    const room = getRoom(roomId);

    if (!room) return console.error("Room not found", roomId);

    const targetClients = room.clients.filter((c) => {
        if (broadcastEvent === BroadcastEvent.ALL) return true;
        if (broadcastEvent === BroadcastEvent.HOST && c.id === room.hostId) return true;
        if (broadcastEvent === BroadcastEvent.OTHERS && c.id !== senderId) return true;
        return false;
    });

    const send = (ws: WebSocket) => {
        const str = JSON.stringify({ type, event, data: body });
        ws.send(str);
    };

    targetClients.forEach((c) => send(c.ws));
}

export async function getDiscordOauth2Information(access_token: String) {
    const res = await fetch("https://discord.com/api/oauth2/@me", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    })
        .then((res) => {
            return res;
        })
        .catch((e) => {
            console.log(e.message);
            return null;
        });
    return res === null ? null : res.json();
}
