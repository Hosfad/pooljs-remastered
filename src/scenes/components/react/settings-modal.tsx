import React from "react";
import { COLORS, CUES } from "../../../common/pool-constants.ts";
import { type GameSettings } from "../../../common/pool-types.ts";
import { Button } from "./button.tsx";
import { Slider } from "./slider.tsx";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: GameSettings;
    onSave: (settings: Partial<GameSettings>) => void;
}

export function SettingsModal({ isOpen, onClose, settings: initialSettings, onSave }: SettingsModalProps) {
    if (!isOpen) return null;
    const [_] = React.useState();

    const [settings, setSettings] = React.useState<GameSettings>(initialSettings);

    const changeSetting = (key: keyof GameSettings, value: number) => {
        setSettings({ ...settings, [key]: value });
    };

    const cueImages = CUES.map((cue) => `/assets/game/cues/${cue.replace("_", "-")}.svg`);
    console.log(cueImages);
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
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    borderRadius: "3rem",
                    padding: "2rem",
                    backgroundColor: COLORS.primary,
                    border: `30px solid ${COLORS.dark}`,
                    position: "relative",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem",
                    }}
                >
                    <h2
                        style={{
                            fontSize: "2rem",
                            fontWeight: "bold",
                            color: COLORS.accent,
                            margin: 0,
                        }}
                    >
                        Game Settings
                    </h2>

                    <Button onClick={onClose} variant="dark">
                        X
                    </Button>
                </div>

                {/* Content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        padding: "1rem",
                    }}
                >
                    {/* Audio Settings Section */}
                    <div>
                        <h3
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "600",
                                color: COLORS.accent,
                                textAlign: "center",
                                marginBottom: "1rem",
                            }}
                        >
                            Audio Settings
                        </h3>

                        {/* Master Volume Slider */}

                        <Slider
                            label="Master Volume"
                            value={settings.masterVolume}
                            onChange={(value) => changeSetting("masterVolume", value)}
                            backgroundColor={`${COLORS.primary}30`}
                            borderColor={COLORS.accent}
                            textColor={COLORS.accent}
                            fillColor={COLORS.accent}
                            showValue={true}
                            valueSuffix="%"
                        />

                        <Slider
                            label="SFX Volume"
                            value={settings.sfxVolume}
                            onChange={(value) => changeSetting("sfxVolume", value)}
                            backgroundColor={`${COLORS.primary}30`}
                            borderColor={COLORS.accent}
                            textColor={COLORS.accent}
                            fillColor={COLORS.accent}
                            showValue={true}
                            valueSuffix="%"
                        />

                        <Slider
                            label="Music Volume"
                            value={settings.musicVolume}
                            onChange={(value) => changeSetting("musicVolume", value)}
                            backgroundColor={`${COLORS.primary}30`}
                            borderColor={COLORS.accent}
                            fillColor={COLORS.accent}
                            textColor={COLORS.accent}
                            showValue={true}
                            valueSuffix="%"
                        />
                    </div>

                    {/* Cue Selection Section */}
                    <div>
                        <h3
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "600",
                                color: COLORS.accent,
                                textAlign: "center",
                                marginBottom: "1rem",
                            }}
                        >
                            Cue Selection
                        </h3>

                        {/* Cue Display Box */}
                        <div
                            style={{
                                width: "full",
                                padding: "1.5rem",
                                backgroundColor: `${COLORS.primary}30`,
                                border: `3px solid ${COLORS.accent}`,
                                borderRadius: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "50px",
                                marginBottom: "1.5rem",
                            }}
                        >
                            <img
                                src={cueImages[settings.selectedCueIndex]}
                                style={{
                                    maxWidth: "100%",
                                    objectFit: "contain",
                                }}
                            />
                        </div>

                        {/* Navigation Arrows */}
                        <div style={{ display: "flex", justifyContent: "center", gap: "8rem" }}>
                            <Button variant="dark" onClick={handlePreviousCue}>
                                <div
                                    style={{
                                        width: 0,
                                        height: 0,
                                        borderTop: "15px solid transparent",
                                        borderBottom: "15px solid transparent",
                                        borderRight: `20px solid ${COLORS.accent}`,
                                    }}
                                />
                            </Button>
                            <Button variant="dark" onClick={handleNextCue}>
                                <div
                                    style={{
                                        width: 0,
                                        height: 0,
                                        borderTop: "15px solid transparent",
                                        borderBottom: "15px solid transparent",
                                        borderLeft: `20px solid ${COLORS.accent}`,
                                    }}
                                />
                            </Button>
                        </div>

                        {/* Action Buttons */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: "1rem",
                                marginTop: "3rem",
                            }}
                        >
                            <Button onClick={resetSettings} variant="destructive">
                                Reset
                            </Button>
                            <Button variant="dark" onClick={() => onSave(settings)}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
