import * as Phaser from "phaser";
import { Modal, type ModalConfig } from "./ui/modal";
import { SliderControl } from "./ui/slider";
import { ToggleControl } from "./ui/toggle";

export interface SettingsConfig {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    inputMethod: "auto" | "touch" | "mouse";
    showAimLine: boolean;
    showPowerMeter: boolean;
    vibration: boolean;
    showTutorial: boolean;
    tableColor: string;
    difficulty: "easy" | "normal" | "hard";
}
const COLORS = {
    color: "#ffd700",
    stroke: "#635504ff",
};

export class SettingsModal extends Modal {
    private currentSettings: SettingsConfig;
    private onSaveCallback: ((settings: SettingsConfig) => void) | undefined;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        const config: ModalConfig = {
            width: 550,
            height: 650,
            title: "SYSTEM SETTINGS",
            scrollable: true,
            scrollHeight: 450,
            panelColor: 0x0a0a1a,
            backgroundColor: 0x001100,
            borderColor: Phaser.Display.Color.HexStringToColor(COLORS.color).color,
            hotkey: Phaser.Input.Keyboard.KeyCodes.F3,
        };

        super(scene, x, y, config);

        this.currentSettings = {
            masterVolume: 1,
            sfxVolume: 1,
            musicVolume: 0.8,
            inputMethod: "auto",
            showAimLine: true,
            showPowerMeter: true,
            vibration: true,
            showTutorial: true,
            tableColor: "#2a4a2a",
            difficulty: "normal",
        };

        this.createSettingsContent();
    }

    private createSettingsContent(): void {
        const container = this.getContentContainer();
        const height = this.config.height;
        let yPosition = -height / 2 + 100;
        const spacing = 60;
        const sectionSpacing = 80;

        // Volume Section
        this.createSectionTitle(container, "AUDIO SETTINGS", yPosition);
        yPosition += spacing;

        this.createVolumeControl(container, "MASTER VOLUME", yPosition, this.currentSettings.masterVolume, (value) => {
            this.currentSettings.masterVolume = value;
        });
        yPosition += spacing;

        this.createVolumeControl(container, "SFX VOLUME", yPosition, this.currentSettings.sfxVolume, (value) => {
            this.currentSettings.sfxVolume = value;
        });
        yPosition += spacing;

        this.createVolumeControl(container, "MUSIC VOLUME", yPosition, this.currentSettings.musicVolume, (value) => {
            this.currentSettings.musicVolume = value;
        });
        yPosition += sectionSpacing;

        // Gameplay Section
        this.createSectionTitle(container, "GAMEPLAY", yPosition);
        yPosition += spacing;

        this.createToggleControl(container, "SHOW POWER METER", yPosition, this.currentSettings.showPowerMeter, (value) => {
            this.currentSettings.showPowerMeter = value;
        });
        yPosition += spacing;
        this.createToggleControl(container, "SHOW AIM LINE", yPosition, this.currentSettings.showPowerMeter, (value) => {
            this.currentSettings.showPowerMeter = value;
        });
        yPosition += spacing;

        this.createActionButtons(container, yPosition + 40);
    }

    private createSectionTitle(container: Phaser.GameObjects.Container, text: string, y: number): void {
        const title = this.scene.add
            .text(0, y, text, {
                fontFamily: '"Courier New", monospace',
                fontSize: "22px",
                color: COLORS.color,
                stroke: COLORS.stroke,
                fontStyle: "bold",
                strokeThickness: 3,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: "#000",
                    blur: 0,
                    fill: true,
                },
            })
            .setOrigin(0.5);

        // Add underline
        const underline = this.scene.add.graphics();
        underline.lineStyle(2, Phaser.Display.Color.HexStringToColor(COLORS.color).color, 0.6);
        underline.beginPath();
        underline.moveTo(-150, y + 25);
        underline.lineTo(150, y + 25);
        underline.strokePath();

        container.add(title);
        container.add(underline);
    }

    private createVolumeControl(
        container: Phaser.GameObjects.Container,
        label: string,
        y: number,
        initialValue: number,
        onChange: (value: number) => void
    ): void {
        const normalizedValue = initialValue / 10;

        const slider = new SliderControl(
            this.scene,
            10,
            y,
            label,
            normalizedValue,
            (value: number) => {
                onChange(Math.round(value));
            },
            200,
            30,
            COLORS.color,
            (value) => {
                return 0xffd700;
            }
        );

        container.add(slider);
    }
    private createToggleControl(
        container: Phaser.GameObjects.Container,
        label: string,
        y: number,
        initialValue: boolean,
        onChange: (value: boolean) => void
    ): void {
        const toggle = new ToggleControl(
            this.scene,
            0,
            y,
            label,
            initialValue,
            (value: boolean) => {
                onChange(value);
            },
            {
                labelColor: COLORS.color,
                colorOnBorder: 0x669900,
                colorOnText: COLORS.color,
                colorOnBg: 0x669900,
                colorOffBg: 0x660000,
            }
        );
        container.add(toggle);
    }

    private createActionButtons(container: Phaser.GameObjects.Container, y: number): void {
        const buttonStyle = {
            fontFamily: '"Courier New", monospace',
            fontSize: "20px",
            color: "#ffffff",
            backgroundColor: "#004400",
            padding: { x: 25, y: 10 },
            stroke: "#00ff00",
            strokeThickness: 2,
        };

        // Save button
        const saveButton = this.scene.add
            .text(-80, y, "SAVE", buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        saveButton.on("pointerover", () => {
            saveButton.setStyle({
                color: "#ffff00",
                backgroundColor: "#006600",
                stroke: "#ffff00",
            });
        });

        saveButton.on("pointerout", () => {
            saveButton.setStyle(buttonStyle);
        });

        saveButton.on("pointerdown", () => {
            saveButton.setStyle({
                color: "#000000",
                backgroundColor: "#00ff00",
                stroke: "#000000",
            });
            this.onSave();
        });

        container.add(saveButton);

        // Reset button
        const resetButton = this.scene.add
            .text(80, y, "RESET", {
                ...buttonStyle,
                backgroundColor: "#440000",
                stroke: "#ff0000",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        resetButton.on("pointerover", () => {
            resetButton.setStyle({
                color: "#ffff00",
                backgroundColor: "#660000",
                stroke: "#ff8800",
            });
        });

        resetButton.on("pointerout", () => {
            resetButton.setStyle({
                ...buttonStyle,
                backgroundColor: "#440000",
                stroke: "#ff0000",
            });
        });

        resetButton.on("pointerdown", () => {
            resetButton.setStyle({
                color: "#000000",
                backgroundColor: "#ff0000",
                stroke: "#000000",
            });
            this.resetToDefaults();
        });

        container.add(resetButton);
    }

    private resetToDefaults(): void {
        this.currentSettings = {
            masterVolume: 1,
            sfxVolume: 1,
            musicVolume: 0.8,
            inputMethod: "auto",
            showAimLine: true,
            showPowerMeter: true,
            vibration: true,
            showTutorial: true,
            tableColor: "#2a4a2a",
            difficulty: "normal",
        };

        this.updateAllUIElements();
    }

    private updateAllUIElements(): void {
        // TODO : Implement updating all UI elements
    }

    private onSave(): void {
        this.onSaveCallback && this.onSaveCallback(this.currentSettings);

        this.scene.time.delayedCall(300, () => {
            this.hide();
        });
    }

    public getCurrentSettings(): SettingsConfig {
        return { ...this.currentSettings };
    }

    public override show(): void {
        super.show();
    }
}
