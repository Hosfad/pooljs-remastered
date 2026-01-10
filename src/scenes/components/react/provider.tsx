// UI Provider

import React, { useCallback, useContext, useEffect } from "react";
import type { BallType } from "../../../common/pool-types";
import { Events } from "../../../common/server-types";
import type { Room } from "../../../server";
import type { MultiplayerService } from "../../../services/multiplayer-service";

interface PocketedBall {
    number: number | "white" | "black";
    ballType: BallType;
}

type GameMessage = {
    message: string;
    from: string;
    timestamp: number;
};

type UIProviderProps = {
    service: MultiplayerService;
    children: React.ReactNode;
};

type UIProviderContext = {
    room: Room | null;
    setRoom: (room: Room) => void;

    // Pocketed balls
    pocketedBalls: PocketedBall[];
    dropBall: (ballNumber: number, ballType: BallType) => void;

    getMessages: (userId: string) => GameMessage[];
};
const MAX_BALLS = 15;

const UIContext = React.createContext<UIProviderContext | null>(null);

export const UIProvider: React.FC<UIProviderProps> = ({ service, children }) => {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());

    const [pocketedBalls, setPocketedBalls] = React.useState<PocketedBall[]>([]);

    const [gameMessages, setGameMessages] = React.useState<GameMessage[]>([]);

    const dropBall = useCallback((ballNumber: number | "white" | "black", ballType: BallType) => {
        setPocketedBalls((prev) => {
            if (prev.length >= MAX_BALLS || prev.some((b) => b.number === ballNumber)) return prev;
            return [...prev, { number: ballNumber, ballType: ballType }];
        });
    }, []);

    // LISTENERS
    useEffect(() => {
        // Local events
        service.subscribe(Events.DROP_BALL, (body) => {
            const { ballNumber, ballType } = body;
            dropBall(ballNumber, ballType);

            console.log("Dropped ball", ballNumber, ballType);
            if (ballType === "white") {
                setTimeout(() => {
                    // remove white ball from pocket
                    setPocketedBalls((prev) => prev.filter((b) => b.ballType !== "white"));
                }, 1500);
            }
        });
        service.subscribe(Events.CHAT_MESSAGE, (body) => {
            const { message, from } = body;
            setGameMessages((prev) => [
                ...prev,
                {
                    message,
                    from,
                    timestamp: Date.now(),
                },
            ]);
        });

        service.subscribe(Events.UPDATE_ROOM, () => {
            setRoom(service.getCurrentRoom());
        });
    }, [service, dropBall]);

    const messagesInterval = setInterval(() => {
        setGameMessages((prev) => prev.filter((msg) => Date.now() - msg.timestamp < 3000));
    }, 500);

    useEffect(() => {
        return () => clearInterval(messagesInterval);
    }, [messagesInterval]);

    const getMessages = useCallback(
        (userId: string) => {
            const messages = gameMessages.filter((msg) => msg.from === userId);
            const earlierFirst = messages.sort((a, b) => a.timestamp - b.timestamp);
            return earlierFirst;
        },
        [gameMessages]
    );

    return (
        <UIContext.Provider value={{ room, setRoom, pocketedBalls, dropBall, getMessages }}>{children}</UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error("useUpload must be used within UploadProvider");
    }
    return context;
};
