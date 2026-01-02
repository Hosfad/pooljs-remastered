import type { BallType, KeyPositions } from "./pool-types";

export type TEventKey = keyof EventsData;

export type TEventListener = {
    on<T extends TEventKey>(event: T, handler: (data: EventsData[T]) => void): void;
    send<T extends TEventKey>(event: T, data: EventsData[T]): void;
};

export enum Events {
    CREATE_ROOM = "create-room",
    CREATE_ROOM_RESPONSE = "create-room-response",
    JOIN_ROOM = "join-room",
    INIT = "game-start",
    ENDS = "game-end",
    PULL = "pull",
    HITS = "hit",
}

type RoomEventData = {
    roomId: string;
    userId: string;
};

export type EventsData = {
    [Events.CREATE_ROOM]: { userId: string };
    [Events.CREATE_ROOM_RESPONSE]: { roomId: string };

    [Events.JOIN_ROOM]: RoomEventData;
    [Events.HITS]: Partial<RoomEventData> & { keyPositions: KeyPositions; state: PoolState };
    [Events.PULL]: Partial<RoomEventData> & { x: number; y: number; angle: number };
    [Events.INIT]: Partial<RoomEventData> & {
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
