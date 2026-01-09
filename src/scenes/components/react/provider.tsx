// UI Provider

import React, { useCallback, useContext, useEffect } from "react";
import type { BallType } from "../../../common/pool-types";
import { Events } from "../../../common/server-types";
import type { Room } from "../../../server";
import type { MultiplayerService } from "../../../services/multiplayer-service";

type UIProviderProps = {
    service: MultiplayerService;
    children: React.ReactNode;
};

interface PocketedBall {
    number: number | "white" | "black";
    ballType: BallType;
}

type UIProviderContext = {
    room: Room | null;
    setRoom: (room: Room) => void;

    // Pocketed balls
    pocketedBalls: PocketedBall[];
    dropBall: (ballNumber: number, ballType: BallType) => void;
};
const MAX_BALLS = 15;

const UIContext = React.createContext<UIProviderContext | null>(null);

export const UIProvider: React.FC<UIProviderProps> = ({ service, children }) => {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());

    const [pocketedBalls, setPocketedBalls] = React.useState<PocketedBall[]>([]);

    const dropBall = useCallback((ballNumber: number | "white" | "black", ballType: BallType) => {
        setPocketedBalls((prev) => {
            if (prev.length >= MAX_BALLS || prev.some((b) => b.number === ballNumber)) return prev;
            return [...prev, { number: ballNumber, ballType: ballType }];
        });
    }, []);

    // LISTENERS
    useEffect(() => {
        service.listen(Events.DROP_BALL, (body) => {
            const { type, data } = body;

            if (type === "error") return console.error("Error in DROP_BALL", body);

            const { ballNumber, ballType } = data;
            dropBall(ballNumber, ballType);

            console.log("Dropped ball", ballNumber, ballType);
            if (ballType === "white") {
                setTimeout(() => {
                    // remove white ball from pocket
                    setPocketedBalls((prev) => prev.filter((b) => b.ballType !== "white"));
                }, 1500);
            }
        });
        service.listen(Events.UPDATE_ROOM, () => {
            setRoom(service.getCurrentRoom());
        });
    }, [service, dropBall]);

    return <UIContext.Provider value={{ room, setRoom, pocketedBalls, dropBall }}>{children}</UIContext.Provider>;
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error("useUpload must be used within UploadProvider");
    }
    return context;
};
