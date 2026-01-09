import React, { useCallback, useEffect, useRef, useState } from "react";
import { Events } from "../../../../common/server-types";
import type { Service } from "../../../../services/service";

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path
            fillRule="evenodd"
            d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z"
            clipRule="evenodd"
        />
    </svg>
);

const chevronPattern = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 28L0 8L20 28L40 8' stroke='rgba(255,255,255,0.4)' stroke-width='4' fill='none'/%3E%3C/svg%3E")`;

const KNOB_HEIGHT = 56;

const PowerMeter = ({ service, position = "right" }: { service: Service; position?: "left" | "right" }) => {
    const [power, setPower] = useState<number>(0);

    const [pixelOffset, setPixelOffset] = useState<number>(0);
    const [trackHeight, setTrackHeight] = useState<number>(0);

    const isManualDraggingRef = useRef(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const trackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (trackRef.current) setTrackHeight(trackRef.current.clientHeight);

        service.subscribe(Events.PULL, (data) => {
            if (isManualDraggingRef.current) return;
            const { power } = data;
            const finalPower = power * 100;

            setIsDragging(true);
            setPixelOffset(calculatePoistionFromPower(finalPower));
            setPower(finalPower);
        });

        service.subscribe(Events.HITS, () => {
            isManualDraggingRef.current = false;
            setIsDragging(false);
            setPixelOffset(0);
            setPower(0);
        });
    }, []);

    const calculatePosition = useCallback((clientY: number) => {
        if (!trackRef.current) return;

        const { top, height } = trackRef.current.getBoundingClientRect();
        const maxTravel = height - KNOB_HEIGHT;

        let newY = clientY - top;

        newY = newY - KNOB_HEIGHT / 2;

        newY = Math.max(0, Math.min(newY, maxTravel));

        setPixelOffset(newY);

        if (maxTravel > 0) {
            const percentage = (newY / maxTravel) * 100;
            setPower(Math.round(percentage));
        }
    }, []);

    const calculatePoistionFromPower = (power: number) => {
        if (!trackRef.current) return 0;
        const { top, height } = trackRef.current.getBoundingClientRect();
        const maxTravel = height - KNOB_HEIGHT;

        let newY = (power / 100) * maxTravel;
        newY = Math.max(0, Math.min(newY, maxTravel));
        return newY;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        isManualDraggingRef.current = true;
        setIsDragging(true);
        calculatePosition(e.clientY);
    };

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!service.isMyTurn()) return;
            if (isDragging) {
                calculatePosition(e.clientY);
            }
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            isManualDraggingRef.current = false;
            setPower(0);
            setPixelOffset(0);
        };

        if (isDragging) {
            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            window.addEventListener("pointercancel", handlePointerUp);
        }

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [isDragging, calculatePosition]);

    const twPosition = position === "left" ? "left-8" : "right-8";

    return (
        <div
            className={`fixed ${twPosition} top-1/2 transform -translate-y-1/3 h-[60vh] z-50 flex flex-col items-center select-none`}
        >
            <div
                className="relative h-full w-18 bg-dark rounded-xl p-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_4px_8px_rgba(0,0,0,0.5)] border-2 border-dark"
                style={{ touchAction: "none" }}
            >
                <div
                    ref={trackRef}
                    onPointerDown={handlePointerDown}
                    className="relative h-full w-full bg-dark rounded-lg overflow-hidden  cursor-pointer shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)]"
                >
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_bottom,_transparent_24%,_#ffffff_25%,_transparent_26%)] bg-[length:100%_25%]" />

                    <div
                        className={`absolute top-0 left-0 w-full overflow-hidden pointer-events-none duration-0"
                      `}
                        style={{
                            height: `${pixelOffset + 4}px`,
                        }}
                    >
                        <div
                            className="w-full absolute top-0 left-0 bg-gradient-to-b from-green-500 via-yellow-500 to-red-600"
                            style={{ height: `${trackHeight}px` }}
                        >
                            <div
                                className="absolute inset-0 opacity-50"
                                style={{
                                    backgroundImage: chevronPattern,
                                    backgroundSize: "40px 40px",
                                    backgroundPosition: "center top",
                                }}
                            />
                        </div>
                    </div>

                    <div
                        className={`absolute left-0 w-full rounded-lg flex items-center justify-center h-14
                        
                        border-t  border-b-2 border-[#bdbdbd]
                        shadow-[0_4px_6px_rgba(0,0,0,0.4)]  duration-0
                        ${isDragging ? "cursor-grabbing brightness-110" : "cursor-grab "}
            `}
                        style={{
                            background: `linear-gradient(to bottom, #eeeeee, #bdbdbd, #9e9e9e)`,
                            transform: `translateY(${pixelOffset}px)`,
                        }}
                    >
                        <div className="absolute inset-x-2 top-1 h-[1px] bg-slate-100 opacity-50"></div>
                        <ChevronDownIcon className="w-10 h-10 text-slate-700 drop-shadow-sm" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PowerMeter;
