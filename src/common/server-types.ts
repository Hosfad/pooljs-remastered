import type { Room } from "../server";
import type { BallType, KeyPositions } from "./pool-types";

type MiddlewareResponse<TOutput> =
    | {
          success: true;
          data: TOutput;
          error?: null;
      }
    | {
          error: string;
      };

export type Middleware<TInput, TOutput = unknown> = (
    data: TInput
) => MiddlewareResponse<TOutput> | Promise<MiddlewareResponse<TOutput>>;
export type MiddlewareInput<TInput, TOutput = unknown> = Middleware<TInput, TOutput> | Middleware<TInput, TOutput>[];

export type TEventKey = keyof EventsData;
type THandler<T extends TEventKey> = (data: EventsData[T] & RoomEventBodyOptions) => void | Promise<void>;

export type TEventListener = {
    on<T extends TEventKey>(event: T, handler: THandler<T>): void;

    on<T extends TEventKey, TOutput = unknown>(
        event: T,
        middleware: MiddlewareInput<EventsData[T] & RoomEventBodyOptions, TOutput>,
        handler: THandler<T>
    ): void;
};

export enum Events {
    // Create room
    UPDATE_ROOM = "update-room",
    CREATE_ROOM = "create-room",
    CREATE_ROOM_RESPONSE = "create-room-response",
    // Join room
    JOIN_ROOM = "join-room",
    JOIN_ROOM_RESPONSE = "join-room-response",
    START_GAME = "game-start",
    MATCH_MAKE_START = "match-make-start",
    MATCH_MAKE_START_RESPONSE = "match-make-start-response",
    MATCH_FOUND = "match-found",
    MATCH_MAKE_CANCEL = "match-make-cancel",
    MATCH_MAKE_CANCEL_RESPONSE = "match-make-cancel-response",
    KICK_PLAYER = "kick-player",

    PLAYER_DISCONNECT = "player-disconnect",
    PLAYER_DISCONNECT_RESPONSE = "player-disconnect-response",

    INIT = "game-init",
    ENDS = "game-end",
    PULL = "pull",
    HITS = "hit",
    HAND = "hand",

    DROP_BALL = "drop-ball",
    DRAG_POWER_METER = "drag-power-meter",
    POWER_METER_HIT = "power-meter-hit",
    CHANGE_SPIN_POSITION = "change-spin-position",
    CHAT_MESSAGE = "chat-message",

    ERROR_ROOM_FULL = "error-room-full",
    SHOW_MODAL = "show-error-modal",
    SHOW_LOADING = "show-loading",
}

export enum BroadcastEvent {
    ALL = "all",
    OTHERS = "others",
    HOST = "host",
}

type RoomId = {
    roomId: string;
};
export type RoomEventBodyOptions = RoomId & {
    senderId: string;
    broadcastEvent: BroadcastEvent;
};

export type WebsocketError =
    | "bad-request"
    | "room-not-found"
    | "user-not-found"
    | "match-making-in-progress"
    | "kicked-from-lobby"
    | (string & {});

export type EventsData = {
    [Events.UPDATE_ROOM]: Room;
    [Events.JOIN_ROOM]: { name: string; photo: string };
    [Events.JOIN_ROOM_RESPONSE]: Room;
    [Events.START_GAME]: {};

    [Events.MATCH_MAKE_START]: {};
    [Events.MATCH_MAKE_START_RESPONSE]: Room;
    [Events.MATCH_MAKE_CANCEL]: {};
    [Events.MATCH_MAKE_CANCEL_RESPONSE]: Room;
    [Events.MATCH_FOUND]: Room;

    [Events.KICK_PLAYER]: { kickTargetId: string };

    [Events.PLAYER_DISCONNECT]: {};
    [Events.PLAYER_DISCONNECT_RESPONSE]: Room;

    [Events.HITS]: { keyPositions: KeyPositions; state: PoolState };
    [Events.PULL]: { x: number; y: number; angle: number; power: number };
    [Events.INIT]: Room;
    [Events.HAND]: { x: number; y: number; click: boolean };

    // UI UPDATES
    [Events.DROP_BALL]: { ballNumber: number | "white" | "black"; ballType: BallType };
    [Events.DRAG_POWER_METER]: { power: number };
    [Events.POWER_METER_HIT]: { power: number };
    [Events.CHANGE_SPIN_POSITION]: { x: number; y: number };
    [Events.CHAT_MESSAGE]: { message: string; from: string };

    // ERRORS
    [Events.ERROR_ROOM_FULL]: RoomId;
    [Events.SHOW_MODAL]: { title: string; description?: string; closeAfter?: number };
    [Events.SHOW_LOADING]: { show: false } | { show: true; message: string; subMessage?: string };
};

export const AUTO_BROADCAST_EVENTS = [
    Events.INIT,
    Events.PULL,
    Events.HITS,
    Events.HAND,
    Events.DROP_BALL,
    Events.DRAG_POWER_METER,
    Events.POWER_METER_HIT,
    Events.CHANGE_SPIN_POSITION,
    Events.CHAT_MESSAGE,
    Events.MATCH_FOUND,
] as const;

export interface PoolState {
    inHole: Record<number, boolean>;
    totals: Record<BallType, number>;
    players: Record<BallType, number>;
    turnIndex: number;
}
