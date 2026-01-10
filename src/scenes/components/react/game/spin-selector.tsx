import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import type { Room } from "../../../../server";
import type { MultiplayerService } from "../../../../services/multiplayer-service";

interface SpinPosition {
    x: number;
    y: number;
}

export default function SpinIndicator({
    room,
    service,
    position = "right",
}: {
    room: Room;
    service: MultiplayerService;
    position?: "left" | "right";
}) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [spinPosition, setSpinPosition] = useState<SpinPosition>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const ballRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        updateSpinPosition(e);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            updateSpinPosition(e);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        setIsDragging(true);
        updateSpinPosition(e.touches[0]! as Touch);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (isDragging) {
            e.preventDefault();
            updateSpinPosition(e.touches[0]!);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const updateSpinPosition = (event: MouseEvent | React.MouseEvent | Touch) => {
        if (!ballRef.current) return;

        const rect = ballRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const radius = rect.width / 2;

        let x = event.clientX - centerX;
        let y = event.clientY - centerY;

        // Constrain to circle
        const distance = Math.sqrt(x * x + y * y);
        if (distance > radius - 20) {
            const angle = Math.atan2(y, x);
            x = (radius - 20) * Math.cos(angle);
            y = (radius - 20) * Math.sin(angle);
        }

        // scene.cue.offset = {
        //     x: (x + 20) / (rect.width * 0.5),
        //     y: (y + 20) / (rect.height * 0.5),
        // };

        setSpinPosition({ x, y });
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.addEventListener("touchmove", handleTouchMove, { passive: false });
            document.addEventListener("touchend", handleTouchEnd);

            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                document.removeEventListener("touchmove", handleTouchMove);
                document.removeEventListener("touchend", handleTouchEnd);
            };
        }
    }, [isDragging]);

    const twPosition = position === "left" ? "left-8" : "right-8";

    return (
        room?.isGameStarted && (
            <div className="relative w-full">
                <AnimatePresence>
                    {!isExpanded && (
                        <motion.div
                            key="collapsed"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            onClick={() => setIsExpanded(true)}
                            className={`fixed top-8 ${twPosition} w-24 h-24 bg-gray-800 rounded-full cursor-pointer shadow-lg overflow-hidden`}
                            style={{
                                backgroundImage: `url(/assets/game/balls/white.svg)`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div
                                className="absolute w-4 h-4 rounded-full border border-4 border-red-500"
                                style={{
                                    left: "50%",
                                    top: "50%",
                                    transform: `translate(calc(-50% + ${spinPosition.x * 0.25}px), calc(-50% + ${spinPosition.y * 0.25
                                        }px))`,
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            ></motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
                            onClick={() => setIsExpanded(false)}
                        >
                            <motion.div
                                className="relative w-full h-full flex flex-col items-center justify-center"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                <motion.div
                                    className="relative"
                                    onClick={(e) => e.stopPropagation()}
                                    initial={{ scale: 0.5 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.5 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                >
                                    <div
                                        ref={ballRef}
                                        className="w-96 h-96 rounded-full shadow-2xl relative overflow-hidden cursor-move"
                                        onMouseDown={handleMouseDown}
                                        onTouchStart={handleTouchStart}
                                        style={{
                                            backgroundImage: `url(/assets/game/balls/white.svg)`,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            backgroundRepeat: "no-repeat",
                                        }}
                                    >
                                        <motion.div
                                            className="absolute w-8 h-8 z-10 rounded-full border-6 border-red-500 shadow-lg pointer-events-none"
                                            style={{
                                                left: "50%",
                                                top: "50%",
                                                transform: `translate(calc(-50% + ${spinPosition.x}px), calc(-50% + ${spinPosition.y}px))`,
                                            }}
                                            transition={
                                                isDragging
                                                    ? { type: "tween", duration: 0 }
                                                    : { type: "spring", stiffness: 300, damping: 20 }
                                            }
                                        ></motion.div>

                                        <div className="absolute top-1/2 left-1/2 z-9 w-1 h-1 bg-gray-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.3 }}
                                    className="mt-8 text-white text-center"
                                >
                                    <p className="text-xl">
                                        Spin: X: {spinPosition.x.toFixed(0)}, Y: {spinPosition.y.toFixed(0)}
                                    </p>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    );
}
