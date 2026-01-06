import { useState } from "react";
import type { GameSettings } from "../../../../common/pool-types";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Button } from "../ui/button";
import { Drawer } from "../ui/drawer";
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

    const changeSetting = (key: keyof GameSettings, value: number) => {
        setSettings({ ...settings, [key]: value });
    };

    return (
        <Drawer title="Game Settings" isOpen={isOpen} onClose={onClose} me={me}>
            <div className="space-y-6 max-w-2xl">
                <div className="bg-white/10 rounded-lg p-6">
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
                <div className="bg-white/10 rounded-lg p-6">
                    <h3 className="text-accent font-bold text-lg mb-4">Game Settings</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-white">Show Hints</span>
                            <input
                                type="checkbox"
                                className="accent-accent" // Change to any color you want
                                checked={settings.showHints}
                                onChange={(e) => setSettings((prev) => ({ ...prev, showHints: e.target.checked }))}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-white">Aim Line</span>
                            <input
                                type="checkbox"
                                className="accent-accent" // Change to any color you want
                                checked={settings.showAimLine}
                                onChange={(e) => setSettings((prev) => ({ ...prev, showAimLine: e.target.checked }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
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
