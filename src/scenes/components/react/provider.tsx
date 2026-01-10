// UI Provider

import { AnimatePresence, motion } from "framer-motion";
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

    getMessage: (userId: string) => GameMessage | null;

    showAnimatedUIMessage: (message: string, duration: number) => void;
};
const MAX_BALLS = 15;

const UIContext = React.createContext<UIProviderContext | null>(null);

export const UIProvider: React.FC<UIProviderProps> = ({ service, children }) => {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());

    const [pocketedBalls, setPocketedBalls] = React.useState<PocketedBall[]>([]);
    const [gameMessages, setGameMessages] = React.useState<GameMessage[]>([]);
    const [uiMessage, setUIMessage] = React.useState<string | null>(null);

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

    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            const THREE_SECONDS = 3000;

            setGameMessages((prev) => {
                const hasExpired = prev.some((msg) => now - msg.timestamp > THREE_SECONDS);
                if (!hasExpired) return prev;
                return prev.filter((msg) => now - msg.timestamp <= THREE_SECONDS);
            });
        }, 1000);

        return () => clearInterval(cleanupInterval);
    }, []);

    const getMessage = (userId: string) => {
        const messages = gameMessages.filter((msg) => msg.from === userId);
        const earlierFirst = messages.sort((a, b) => a.timestamp - b.timestamp);
        const first = earlierFirst[0];
        return first ?? null;
    };

    const showAnimatedUIMessage = useCallback(
        (message: string, duration: number) => {
            setUIMessage(message);
            setTimeout(() => setUIMessage(null), duration);
        },
        [setGameMessages]
    );

    return (
        <UIContext.Provider value={{ room, setRoom, pocketedBalls, dropBall, getMessage, showAnimatedUIMessage }}>
            {children}

            <AnimatePresence>
                {uiMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
                    >
                        <div className="bg-accent text-dark px-10 py-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-b-4 border-dark/20 flex items-center gap-4">
                            <div className="w-3 h-3 bg-dark rounded-full animate-pulse" />

                            <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase italic whitespace-nowrap">
                                {uiMessage}
                            </h1>

                            <div className="w-3 h-3 bg-dark rounded-full animate-pulse" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error("useUpload must be used within UploadProvider");
    }
    return context;
};
