"use client";

import { AlertCircle, Lightbulb, MousePointer2, Target, Trophy, XCircle } from "lucide-react";
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Events } from "../../../common/server-types";
import type { MultiplayerService } from "../../../services/multiplayer-service";
import { SettingsModal } from "./settings-modal";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";

export function ActionButtons({ service }: { service: MultiplayerService }) {
    const [modalOpen, setModalOpen] = React.useState<string | null>();

    const [error, setError] = React.useState<{
        title: string;
        description?: string;
    } | null>(null);

    const modals = {
        settings: () => (
            <SettingsModal
                settings={service.getSettings()}
                isOpen={modalOpen === "settings"}
                onClose={() => setModalOpen(null)}
                onSave={(data) => service.setSettings(data)}
            />
        ),
        "how-to-play": () => (
            <Modal isOpen={modalOpen === "how-to-play"} onClose={() => setModalOpen(null)} title="How to play">
                <div className="flex flex-col gap-4 p-2 px-8">
                    <div className="flex gap-3">
                        <Target className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-accent text-lg mb-1">Objective</h3>
                            <p className="text-text dark:text-gray-300">
                                Pot all of your designated balls (solids or stripes) and then sink the 8-ball to win the
                                game.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 ">
                        <MousePointer2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-accent text-lg mb-1">Controls</h3>
                            <p className="text-text dark:text-gray-300">
                                <strong>Aim:</strong> Move your mouse/finger to aim the cue stick.
                                <br />
                                <strong>Power:</strong> Pull back to set shot power.
                                <br />
                                <strong>Shoot:</strong> Release to take your shot.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-accent text-lg mb-1">Rules</h3>
                            <ul className="text-text dark:text-gray-300 space-y-1">
                                <li>• Break the rack to start the game</li>
                                <li>• First ball potted determines your group (solids/stripes)</li>
                                <li>• You get another turn if you pot your ball legally</li>
                                <li>• Foul if you pot the cue ball or opponent's ball</li>
                                <li>• Pot the 8-ball last to win (but not on the break!)</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <XCircle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-accent text-lg mb-1">Fouls</h3>
                            <p className="text-text dark:text-gray-300">
                                Scratching the cue ball, failing to hit your ball first, or potting the 8-ball early results
                                in your opponent getting ball-in-hand.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Lightbulb className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-accent text-lg mb-1">Tips</h3>
                            <ul className="text-text dark:text-gray-300 space-y-1">
                                <li>• Plan your position for the next shot</li>
                                <li>• Use spin to control the cue ball</li>
                                <li>• Don't always shoot at maximum power</li>
                                <li>• Think defensively if you don't have a clear shot</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex items-center justify-start gap-3 mt-2 p-3 rounded-lg">
                        <Trophy className="w-6 h-6 text-accent  flex-shrink-0 mt-1" />
                        <div>
                            <p className="text-text dark:text-gray-300 font-medium">Good luck and enjoy the game!</p>
                        </div>
                    </div>
                </div>
            </Modal>
        ),
        error: () =>
            error && (
                <Modal
                    className="md:w-[40vw]! h-fit! overflow-hidden!"
                    isOpen={modalOpen === "error" && error !== null}
                    onClose={() => setModalOpen(null)}
                    title={error.title}
                >
                    {error.description && (
                        <div className="flex flex-col gap-4 p-2 sm:p-4 ">
                            <p>{error.description}</p>
                        </div>
                    )}
                </Modal>
            ),
    };

    useEffect(() => {
        service.subscribe(Events.SHOW_MODAL, (data) => {
            const closeAfter = data.closeAfter;
            setError(data);
            setModalOpen("error");
            if (closeAfter) {
                setTimeout(() => setModalOpen(null), closeAfter);
            }
        });
    }, []);

    const location = useLocation();
    const path = location.pathname;

    return (
        <>
            <div className="absolute top-2 right-2 p-2 flex gap-2">
                <Button
                    className="w-8  h-8 md:h-10 md:w-10 px-4! py-4!"
                    onClick={() => setModalOpen("how-to-play")}
                    variant="dark"
                >
                    ❓
                </Button>
                <Button
                    className="w-8  h-8 md:h-10 md:w-10 px-4! py-4!"
                    variant="dark"
                    onClick={() => setModalOpen("settings")}
                >
                    ⚙️
                </Button>

                {Object.keys(modals).map((key) => {
                    return modals[key as keyof typeof modals]();
                })}
            </div>
        </>
    );
}
