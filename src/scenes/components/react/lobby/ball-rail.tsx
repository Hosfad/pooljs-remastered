import { useCallback, useEffect, useRef, useState } from "react";
import { Events, type PoolState } from "../../../../common/server-types";
import type { MultiplayerService } from "../../../../services/multiplayer-service";

const BALL_SIZE = 24;

interface BallData {
    id: number;
    ballIndex: number;
    targetY: number;
}

const BallRail = ({ service, maxBalls = 15 }: { service: MultiplayerService; maxBalls?: number }) => {
    const [balls, setBalls] = useState<BallData[]>([]);
    const railRef = useRef<HTMLDivElement>(null);

    const [state, setState] = useState<PoolState | null>(service.getState());

    useEffect(() => {
        service.subscribe(Events.HITS, () => {
            setState(service.getState());
        });
        service.subscribe(Events.UPDATE_ROOM, () => {
            setState(service.getState());
        });
    }, [service]);

    const getBallImage = (index: number) => {
        let finalIndex = index + 1 + "";
        if (finalIndex === "8") finalIndex = "black";
        if (finalIndex === "16") finalIndex = "white";
        console.log(finalIndex);
        return `/assets/game/balls/${finalIndex}.svg`;
    };

    // Function to trigger a new ball drop
    const dropBall = useCallback(
        (ballIndex: number) => {
            if (!railRef.current) return;

            const railHeight = railRef.current.clientHeight;

            setBalls((prev) => {
                if (prev.length >= maxBalls) return prev;

                // Calculate resting position:
                // Total height - (number of balls already there + 1) * ball size
                const restingY = railHeight - (prev.length + 1) * BALL_SIZE;

                const newBall: BallData = {
                    id: Date.now(),
                    ballIndex,
                    targetY: restingY,
                };

                return [...prev, newBall];
            });
        },
        [maxBalls]
    );

    useEffect(() => {
        if (!state?.inHole) return;
        const pocketedIndices = Object.keys(state.inHole)
            .map(Number)
            .filter((i) => i !== 8 && i !== 16);
        const newBallsToDrop = pocketedIndices.filter((index) => !balls.some((b) => b.ballIndex === index));
        if (newBallsToDrop.length > 0) {
            newBallsToDrop.forEach((ballIndex) => {
                dropBall(ballIndex);
            });
        }
    }, [state]);

    return (
        <div className="fixed left-8 top-1/2 transform -translate-y-1/3 h-[60vh] z-40 flex flex-col items-center">
            <div className="relative h-full w-12 bg-dark rounded-full p-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_4px_8px_rgba(0,0,0,0.5)] border-2 border-dark">
                <div
                    ref={railRef}
                    className="relative h-full w-full bg-dark rounded-full overflow-hidden shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]"
                >
                    <div className="absolute inset-y-0 left-4 w-1 bg-slate-500/30 rounded-full" />
                    <div className="absolute inset-y-0 right-4 w-1 bg-slate-500/30 rounded-full" />

                    {balls.map((ball) => (
                        <div
                            key={ball.id}
                            className="absolute left-1/2 -translate-x-1/2 transition-all duration-700 ease-bounce"
                            style={{
                                top: `${ball.targetY}px`,
                                width: `${BALL_SIZE}px`,
                                height: `${BALL_SIZE}px`,
                                animation: "dropIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
                            }}
                        >
                            <img
                                src={getBallImage(ball.ballIndex)}
                                alt={`Ball ${ball.ballIndex}`}
                                className="w-full h-full drop-shadow-lg"
                            />
                        </div>
                    ))}
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
