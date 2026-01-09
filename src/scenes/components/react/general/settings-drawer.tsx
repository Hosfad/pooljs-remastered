import { useState } from "react";
import type { GameSettings } from "../../../../common/pool-types";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Button } from "../ui/button";
import { Drawer } from "../ui/drawer";
import { RadioGroup } from "../ui/radio-group";
import { Slider } from "../ui/slider";

export function SettingsDrawer({
    isOpen,
    onClose,
    service,
}: {
    isOpen: boolean;
    onClose: () => void;
    service: MultiplayerService;
}) {
    const me = service.me();
    const [settings, setSettings] = useState<GameSettings>(service.getSettings());

    const handleSave = () => {
        service.setSettings(settings);
        onClose();
    };

    const handleReset = () => {
        setSettings(service.getSettings());
    };

    const changeSetting = (key: keyof GameSettings, value: number | boolean | string) => {
        setSettings({ ...settings, [key]: value });
    };

    return (
        <Drawer title="Game Settings" isOpen={isOpen} onClose={onClose} me={me} slideFrom="bottom">
            <div className="space-y-6 grid grid-cols-2  gap-4 px-12">
                <div className="bg-white/5 border border-white/10 rounded-lg rounded-lg p-6 col-span-2">
                    <h3 className="text-accent font-bold text-lg mb-4">Audio Settings</h3>
                    <div className="space-y-4">
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
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-accent font-bold text-lg mb-4">Game UI</h3>
                    <div className="space-y-2">
                        <RadioGroup
                            label="Power Meter Position"
                            selectedValue={settings.powerMeterPosition}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Right", value: "right" },
                            ]}
                            onChange={(val) => changeSetting("powerMeterPosition", val)}
                        />
                    </div>
                    <div className="space-y-2">
                        <RadioGroup
                            label="Pocketed Balls Position"
                            selectedValue={settings.powerMeterPosition === "left" ? "right" : "left"}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Right", value: "right" },
                            ]}
                            onChange={(val) => {
                                changeSetting("powerMeterPosition", val === "left" ? "right" : "left");
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <RadioGroup
                            label="Spin Selector Position"
                            selectedValue={settings.spinSelectorPosition}
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Right", value: "right" },
                            ]}
                            onChange={(val) => {
                                changeSetting("spinSelectorPosition", val);
                            }}
                        />
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-accent font-bold text-lg mb-4">Game Settings</h3>
                    <div className="space-y-2">
                        <RadioGroup
                            label="Aim Line"
                            selectedValue={settings.powerMeterPosition}
                            options={[
                                { label: "On", value: "on" },
                                { label: "Off", value: "off" },
                            ]}
                            onChange={(val) => changeSetting("powerMeterPosition", val)}
                        />
                    </div>
                </div>

                <div className="flex gap-4 p-6 col-span-2 bg-white/5 border border-white/10 rounded-lg">
                    <Button onClick={handleSave} variant="dark">
                        Save Settings
                    </Button>

                    <Button variant="destructive" onClick={handleReset}>
                        Reset Settings
                    </Button>
                </div>
            </div>
        </Drawer>
    );
}
