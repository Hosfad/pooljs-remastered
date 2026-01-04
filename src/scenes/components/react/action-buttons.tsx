"use client";

import React, { useEffect } from "react";
import { Events } from "../../../common/server-types";
import type { LocalService } from "../../../services/local-service";
import type { MultiplayerService } from "../../../services/multiplayer-service";
import { Button } from "./button";
import { Modal } from "./modal";
import { SettingsModal } from "./settings-modal";

export function ActionButtons({ service }: { service: MultiplayerService | LocalService }) {
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
                <div className="flex flex-col gap-4 p-2 sm:p-4 "></div>{" "}
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

    return (
        <div className="absolute top-2 right-2 p-2 flex gap-2">
            <Button
                className="w-8  h-8 md:h-10 md:w-10 px-4! py-4!"
                onClick={() => setModalOpen("how-to-play")}
                variant="dark"
            >
                ❓
            </Button>
            <Button className="w-8  h-8 md:h-10 md:w-10 px-4! py-4!" variant="dark" onClick={() => setModalOpen("settings")}>
                ⚙️
            </Button>

            {Object.keys(modals).map((key) => {
                return modals[key as keyof typeof modals]();
            })}
        </div>
    );
}
