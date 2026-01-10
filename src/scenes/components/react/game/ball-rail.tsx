import { useEffect, useRef, useState } from "react";
import { useUI } from "../provider";

const BALL_SIZE = 24;

const BallRail = ({ position = "right" }: { position?: "left" | "right" }) => {
    const { pocketedBalls } = useUI();
    const railRef = useRef<HTMLDivElement>(null);
    const [railInfo, setRailInfo] = useState<{ ballSize: number; height: number }>({
        ballSize: 0,
        height: 0,
    });

    useEffect(() => {
        const updateHeight = () => {
            if (railRef.current) {
                setRailInfo({
                    ballSize: BALL_SIZE,
                    height: railRef.current.clientHeight,
                });
            }
        };

        updateHeight();

        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    const getBallImage = (number: number | "white" | "black") => {
        let finalNumber = number + "";
        if (finalNumber === "8") finalNumber = "black";
        if (finalNumber === "16") finalNumber = "white";

        return `/assets/game/balls/${finalNumber}.svg`;
    };

    const getBallRestingY = (index: number) => {
        const restingY = railInfo.height - index * railInfo.ballSize;
        return restingY;
    };

    const twPosition = position === "left" ? "left-2" : "right-2";

    return (
        <div className={`fixed ${twPosition} top-1/2 transform -translate-y-1/3 h-[60vh] z-40 flex flex-col items-center`}>
            <div className="relative h-full w-12 bg-dark rounded-full p-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_4px_8px_rgba(0,0,0,0.5)] border-2 border-dark">
                <div
                    ref={railRef}
                    className="relative h-full w-full bg-dark rounded-full overflow-hidden shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]"
                >
                    <div className="absolute inset-y-0 left-4 w-1 bg-slate-500/30 rounded-full" />
                    <div className="absolute inset-y-0 right-4 w-1 bg-slate-500/30 rounded-full" />

                    {pocketedBalls.map((ball, index) => {
                        return (
                            <div
                                key={`ball-in-pocket-${ball.number}`}
                                className="absolute left-1/2 -translate-x-1/2 transition-all duration-700 ease-bounce"
                                style={{
                                    top: `${getBallRestingY(index + 1)}px`,
                                    width: `${BALL_SIZE}px`,
                                    height: `${BALL_SIZE}px`,
                                    animation: "dropIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
                                }}
                            >
                                <img
                                    src={getBallImage(ball.number ?? ball.ballType)}
                                    alt={`Ball ${ball.number}`}
                                    className="w-full h-full drop-shadow-lg"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`

@keyframes dropIn {
    0% {
        transform: translate(0, -100vh);
        opacity: 0;
    }
    60% {
        opacity: 1;
    }
    100% {
        transform: translate(0, 0);
    }
}

/* Custom bounce for the "landing" feel */
.ease-bounce {
    transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}



`}</style>
        </div>
    );
};

export default BallRail;
