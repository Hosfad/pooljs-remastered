// components/LoadingAnimation.tsx
import React, { useEffect, useState } from "react";
import { Events } from "../../../../common/server-types";
import type { MultiplayerService } from "../../../../services/multiplayer-service";

interface LoadingAnimationProps {
    message?: string;
    subMessage?: string;
    showDots?: boolean;
}

function LoadingAnimation({ message = "Finding Opponent", subMessage, showDots = true }: LoadingAnimationProps) {
    const [dots, setDots] = React.useState("");

    React.useEffect(() => {
        if (!showDots) return;

        const interval = setInterval(() => {
            setDots((prev) => {
                if (prev.length >= 3) return "";
                return prev + ".";
            });
        }, 500);

        return () => clearInterval(interval);
    }, [showDots]);

    return (
        <div className="w-screen h-screen fixed inset-0 z-50 flex items-center justify-center bg-primary bg-opacity-80 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-full max-w-md px-4">
                <div className="relative w-[120px] sm:w-[150px] h-[40px] sm:h-[50px] flex items-center justify-center">
                    <img
                        src="/assets/game/balls/white.svg"
                        alt="Bouncing ball 1"
                        className="absolute w-[25px] sm:w-[30px] h-[25px] sm:h-[30px] object-contain rounded-full animate-bounce-left"
                        style={{
                            transform: "translateX(-35px) translateY(0)",
                        }}
                    />

                    <img
                        src="/assets/game/balls/1.svg"
                        alt="Bouncing ball 2"
                        className="absolute w-[25px] sm:w-[30px] h-[25px] sm:h-[30px] object-contain rounded-full animate-bounce-center"
                        style={{
                            transform: "translateX(0) translateY(0)",
                        }}
                    />

                    <img
                        src="/assets/game/balls/black.svg"
                        alt="Bouncing ball 3"
                        className="absolute w-[25px] sm:w-[30px] h-[25px] sm:h-[30px] object-contain rounded-full animate-bounce-right"
                        style={{
                            transform: "translateX(35px) translateY(0)",
                        }}
                    />
                </div>

                <div className="text-center">
                    <h2 className="text-sm sm:text-base font-bold text-white mb-0.5">
                        {message}
                        {showDots ? dots : ""}
                    </h2>
                    {subMessage && <p className="text-[10px] sm:text-xs text-gray-300">{subMessage}</p>}
                </div>

                <style>{`
          @keyframes bounce-left {
            0%,
            100% {
              transform: translateX(-35px) translateY(0);
            }
            50% {
              transform: translateX(-35px) translateY(-20px);
            }
          }
          @keyframes bounce-center {
            0%,
            100% {
              transform: translateX(0) translateY(0);
            }
            50% {
              transform: translateX(0) translateY(-30px);
            }
          }
          @keyframes bounce-right {
            0%,
            100% {
              transform: translateX(35px) translateY(0);
            }
            50% {
              transform: translateX(35px) translateY(-20px);
            }
          }
          .animate-bounce-left {
            animation: bounce-left 1.5s ease-in-out infinite;
          }
          .animate-bounce-center {
            animation: bounce-center 1.5s ease-in-out infinite 0.25s;
          }
          .animate-bounce-right {
            animation: bounce-right 1.5s ease-in-out infinite 0.5s;
          }
        `}</style>
            </div>
        </div>
    );
}

export function LoadingPage({ service }: { service: MultiplayerService }) {
    const [state, setState] = useState<{
        show: boolean;
        message: string;
        subMessage?: string;
    } | null>({
        show: true,
        message: "Loading...",
        subMessage: undefined,
    });

    useEffect(() => {
        service.subscribe(Events.SHOW_LOADING, (data) => {
            if (data.show) {
                setState({
                    show: true,
                    message: data.message,
                    subMessage: data.subMessage,
                });
            } else {
                setState(null);
            }
        });
    }, []);

    return state && state.show && <LoadingAnimation message={state?.message} subMessage={state?.subMessage} />;
}
