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
    CREATE_ROOM = "create-room",
    CREATE_ROOM_RESPONSE = "create-room-response",
    // Join room
    JOIN_ROOM = "join-room",
    JOIN_ROOM_RESPONSE = "join-room-response",
    START_GAME = "game-start",

    INIT = "game-init",
    ENDS = "game-end",
    PULL = "pull",
    HITS = "hit",

    ERROR_ROOM_FULL = "error-room-full",
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
    [Events.JOIN_ROOM]: { userId: string; name: string; roomId?: string };
    [Events.JOIN_ROOM_RESPONSE]: WebsocketRespone<Room>;
    [Events.START_GAME]: RoomEventBodyOptions;

    [Events.HITS]: RoomEventBodyOptions & { keyPositions: KeyPositions; state: PoolState };
    [Events.PULL]: RoomEventBodyOptions & { x: number; y: number; angle: number };
    [Events.INIT]: Room;

    // ERRORS
    [Events.ERROR_ROOM_FULL]: WebsocketRespone<RoomId>;
};

export interface PoolState {
    inHole: Record<number, boolean>;
    totals: Record<BallType, number>;
    players: Record<BallType, number>;
    turnIndex: number;
    roundStart: number;
}
