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
type THandler<T extends TEventKey> = (data: EventsData[T]) => void | Promise<void>;

export type TEventListener = {
    on<T extends TEventKey>(event: T, handler: THandler<T>): void;

    on<T extends TEventKey, TOutput = unknown>(
        event: T,
        middleware: MiddlewareInput<EventsData[T], TOutput>,
        handler: THandler<T>
    ): void;

    send<T extends TEventKey>(event: T, data: EventsData[T]): void;
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

    ERROR_ROOM_FULL = "error-room-full",
    SHOW_MODAL = "show-error-modal",
    SHOW_LOADING = "show-loading",
}

type RoomId = {
    roomId: string;
};
export type RoomEventBodyOptions = RoomId & {
    userId: string;
};

export type WebsocketError = {
    type: "error";
    message: string;
    code: "bad-request" | "room-not-found" | "user-not-found" | (string & {});
};
export type WebsocketRespone<T> =
    | WebsocketError
    | {
          type: "success";
          data: T;
      };

export type EventsData = {
    [Events.UPDATE_ROOM]: Room;
    [Events.JOIN_ROOM]: { userId: string; name: string; photo: string; roomId?: string };
    [Events.JOIN_ROOM_RESPONSE]: WebsocketRespone<Room>;
    [Events.START_GAME]: RoomEventBodyOptions;

    [Events.MATCH_MAKE_START]: RoomEventBodyOptions;
    [Events.MATCH_MAKE_START_RESPONSE]: WebsocketRespone<Room>;
    [Events.MATCH_MAKE_CANCEL]: RoomEventBodyOptions;
    [Events.MATCH_MAKE_CANCEL_RESPONSE]: WebsocketRespone<Room>;
    [Events.KICK_PLAYER]: RoomEventBodyOptions & { kickTargetId: string };

    [Events.PLAYER_DISCONNECT]: RoomEventBodyOptions;
    [Events.PLAYER_DISCONNECT_RESPONSE]: WebsocketRespone<Room>;

    [Events.HITS]: RoomEventBodyOptions & { keyPositions: KeyPositions; state: PoolState };
    [Events.PULL]: RoomEventBodyOptions & { x: number; y: number; angle: number; power: number };
    [Events.INIT]: Room;
    [Events.HAND]: RoomEventBodyOptions & { x: number; y: number };

    // ERRORS
    [Events.ERROR_ROOM_FULL]: WebsocketRespone<RoomId>;
    [Events.SHOW_MODAL]: { title: string; description?: string; closeAfter?: number };
    [Events.SHOW_LOADING]: { show: false } | { show: true; message: string; subMessage?: string };
};

export interface PoolState {
    inHole: Record<number, boolean>;
    totals: Record<BallType, number>;
    players: Record<BallType, number>;
    turnIndex: number;
}
