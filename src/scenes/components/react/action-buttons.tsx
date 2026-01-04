"use client";

import React from "react";
import type { LocalService } from "../../../services/local-service";
import type { MultiplayerService } from "../../../services/multiplayer-service";
import { Button } from "./button";
import { SettingsModal } from "./settings-modal";

export function ActionButtons({ service }: { service: MultiplayerService | LocalService }) {
    const [modalOpen, setModalOpen] = React.useState<string | null>();

    const modals = {
        settings: () => (
            <SettingsModal
                settings={service.getSettings()}
                isOpen={modalOpen === "settings"}
                onClose={() => setModalOpen(null)}
                onSave={(data) => service.setSettings(data)}
            />
        ),
        "how-to-play": () => <div>How to play</div>,
    };
    const openModal = modalOpen ? modals[modalOpen as keyof typeof modals]() : null;

    return (
        <div className="absolute top-2 right-2 p-2 flex gap-2">
            <Button className="w-8  h-8 md:h-10 md:w-10 px-4! py-4!" variant="dark">
                ❓
            </Button>
            <Button className="w-8  h-8 md:h-10 md:w-10 px-4! py-4!" variant="dark" onClick={() => setModalOpen("settings")}>
                ⚙️
            </Button>

            {openModal}
        </div>
    );
}
