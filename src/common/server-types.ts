import type { Room } from "../server";
import type { BallType, KeyPositions } from "./pool-types";

export type TEventKey = keyof EventsData;

export type TEventListener = {
    on<T extends TEventKey>(event: T, handler: (data: EventsData[T]) => void): void;
    send<T extends TEventKey>(event: T, data: EventsData[T]): void;
};

export enum Events {
    // Create room
    CREATE_ROOM = "create-room",
    CREATE_ROOM_RESPONSE = "create-room-response",
    // Join room
    JOIN_ROOM = "join-room",
    JOIN_ROOM_RESPONSE = "join-room-response",

    INIT = "game-start",
    ENDS = "game-end",
    PULL = "pull",
    HITS = "hit",

    ERROR_ROOM_FULL = "error-room-full",
}

type RoomEventData = {
    roomId: string;
    userId: string;
};

export type EventsData = {
    [Events.CREATE_ROOM]: { userId: string; name: string };
    [Events.CREATE_ROOM_RESPONSE]: { roomId: string };

    [Events.JOIN_ROOM]: RoomEventData & { name: string };
    [Events.JOIN_ROOM_RESPONSE]: Room;
    [Events.ERROR_ROOM_FULL]: { roomId: string; error: string };

    [Events.HITS]: RoomEventData & { keyPositions: KeyPositions; state: PoolState };
    [Events.PULL]: RoomEventData & { x: number; y: number; angle: number };
    [Events.INIT]: RoomEventData & {
        players: {
            id: string;
            name: string;
            photo: string;
            ballType: BallType;
        }[];
    };
};

export interface PoolState {
    inHole: Record<number, boolean>;
    totals: Record<BallType, number>;
    players: Record<BallType, number>;
    turnIndex: number;
}
