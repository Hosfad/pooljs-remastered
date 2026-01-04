"use client";

import React from "react";
import { CUES } from "../../../common/pool-constants.ts";
import type { GameSettings } from "../../../common/pool-types.ts";
import { Button } from "./button.tsx";
import { Modal } from "./modal.tsx";
import { Slider } from "./slider.tsx";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: GameSettings;
    onSave: (settings: Partial<GameSettings>) => void;
}

export function SettingsModal({ isOpen, onClose, settings: initialSettings, onSave }: SettingsModalProps) {
    const [settings, setSettings] = React.useState<GameSettings>(initialSettings);

    if (!isOpen) return null;

    const changeSetting = (key: keyof GameSettings, value: number) => {
        setSettings({ ...settings, [key]: value });
    };

    const cueImages = CUES.map((cue) => `/assets/game/cues/${cue.replace("_", "-")}.svg`);

    const handlePreviousCue = () => {
        setSettings({
            ...settings,
            selectedCueIndex: settings.selectedCueIndex === 0 ? CUES.length - 1 : settings.selectedCueIndex - 1,
        });
    };

    const handleNextCue = () => {
        setSettings({
            ...settings,
            selectedCueIndex: settings.selectedCueIndex + 1 >= CUES.length ? 0 : settings.selectedCueIndex + 1,
        });
    };

    const resetSettings = () => {
        setSettings(initialSettings);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Game Settings">
            <div className="flex flex-col gap-4 p-2 sm:p-4 ">
                {/* Audio Settings Section */}
                <div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-accent text-center mb-3 sm:mb-4">
                        Audio Settings
                    </h3>

                    <Slider
                        label="Master Volume"
                        value={settings.masterVolume}
                        onChange={(value) => changeSetting("masterVolume", value)}
                        showValue={true}
                        valueSuffix="%"
                    />

                    <Slider
                        label="SFX Volume"
                        value={settings.sfxVolume}
                        onChange={(value) => changeSetting("sfxVolume", value)}
                        showValue={true}
                        valueSuffix="%"
                    />

                    <Slider
                        label="Music Volume"
                        value={settings.musicVolume}
                        onChange={(value) => changeSetting("musicVolume", value)}
                        showValue={true}
                        valueSuffix="%"
                    />
                </div>

                {/* Cue Selection Section */}
                <div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-accent text-center mb-3 sm:mb-4">Cue Selection</h3>

                    {/* Cue Display Box */}
                    <div className="w-full p-4 sm:p-6 bg-primary/30 border-2 sm:border-3 border-accent rounded-xl flex items-center justify-center md:min-h-[140px] md:max-h-[140px] min-h-[100px] max-h-[100px] mb-4 sm:mb-6">
                        <img
                            src={cueImages[settings.selectedCueIndex] || "/placeholder.svg"}
                            className="max-w-full object-contain"
                            alt="Selected cue"
                        />
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex justify-center gap-16 sm:gap-32 mb-6 sm:mb-8">
                        <Button variant="dark" onClick={handlePreviousCue} className="!px-4 !py-3">
                            <div className="w-0 h-0 border-t-[12px] sm:border-t-[15px] border-t-transparent border-b-[12px] sm:border-b-[15px] border-b-transparent border-r-[16px] sm:border-r-[20px] border-r-accent" />
                        </Button>
                        <Button variant="dark" onClick={handleNextCue} className="!px-4 !py-3">
                            <div className="w-0 h-0 border-t-[12px] sm:border-t-[15px] border-t-transparent border-b-[12px] sm:border-b-[15px] border-b-transparent border-l-[16px] sm:border-l-[20px] border-l-accent" />
                        </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <Button onClick={resetSettings} variant="destructive">
                            Reset
                        </Button>
                        <Button variant="dark" onClick={() => onSave(settings)}>
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
