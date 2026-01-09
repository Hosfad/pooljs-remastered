import express from "express";
import { v4 as uuid } from "uuid";
import WebSocket, { WebSocketServer } from "ws";
import { Experience } from "./common";
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
        broadcastEvent({ roomId: combinedRoom.id, senderId: combinedRoom.hostId! }, Events.INIT, {
            type: "success",
            ...reshapeRoom(combinedRoom),
        });
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

    eventListener.on(Events.JOIN_ROOM, (data) => {
        const { roomId, userId: senderId, name, photo } = data;
        const room = roomId ? getRoom(roomId) : null;

        if (!room) {
            const newRoom = createNewRoom({ userId: senderId, name, photo }, ws, roomId);
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
        rooms[room.id] = room;

        sendEvent(ws, Events.MATCH_MAKE_START_RESPONSE, { type: "success", data: reshapeRoom(room) });
    });

    eventListener.on(Events.MATCH_MAKE_CANCEL, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
        if (!room) return console.error("Room not found (match make cancel)", roomId);
        if (room.clients.length === 2) return console.error("Match already found (match make cancel)", roomId);

        room.isMatchMaking = false;
        sendEvent(ws, Events.MATCH_MAKE_CANCEL_RESPONSE, { type: "success", data: reshapeRoom(room) });
    });

    eventListener.on(Events.KICK_PLAYER, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId, kickTargetId } = data;
        const room = getRoom(roomId);
        if (!room) return console.error("Room not found (kick player)", roomId);
        if (room.hostId !== senderId) return console.error("Only the host can kick players", roomId);
        if (room.clients.length < 2) return console.error("Cannot kick player your self", roomId);

        const client = room.clients.find((c) => c.id === kickTargetId);
        if (!client) return console.error("Client not found", roomId);
        room.clients = room.clients.filter((c) => c.id !== kickTargetId);

        broadcastEvent(
            {
                roomId,
                senderId,
            },
            Events.UPDATE_ROOM,
            {
                type: "success",
                ...reshapeRoom(room),
            }
        );
        room.kickedPlayers = room.kickedPlayers ?? [];
        room.kickedPlayers.push(kickTargetId);
        client.ws.close();
        rooms[room.id] = room;
        console.log("Kicked player", kickTargetId, "from room", room.id);
    });

    eventListener.on(Events.PLAYER_DISCONNECT, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);
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

        broadcastEvent({ roomId: room.id, senderId: senderId! }, Events.PLAYER_DISCONNECT_RESPONSE, {
            type: "success",
            data: reshapeRoom(room),
        });
    });

    eventListener.on(Events.START_GAME, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId);

        if (!room) return;
        room.isGameStarted = true;
        rooms[room.id] = room;

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

    eventListener.on(Events.HAND, withRoomAuthMiddleware, (data) => {
        const { roomId, userId: senderId } = data;
        const room = getRoom(roomId)!;

        broadcastEvent({ roomId: room.id, senderId: senderId! }, Events.HAND, { type: "success", ...data });
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
    return { ...room, players };
}
function reshapePlayer(c: Client) {
    const newC = { ...c, ws: undefined };
    delete newC.ws;
    const player: Player = { ...newC };
    return player;
}

function createEventListener(ws: WebSocket): TEventListener {
    type EventListeners<T extends TEventKey> = {
        middlewares: Middleware<EventsData[T]>[];
        handler: (data: EventsData[T]) => void;
    };

    const listeners: { [K in TEventKey]?: EventListeners<K>[] } = {} as any;

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
