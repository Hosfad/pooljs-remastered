// import * as Phaser from "phaser";
// import { CUE_DATA, type CueId } from "../../common/pool-types";
// import { Modal, type ModalConfig } from "./ui/modal";
// import { SliderControl } from "./ui/slider";
// import { ToggleControl } from "./ui/toggle";

// export interface SettingsConfig {
//     masterVolume: number;
//     sfxVolume: number;
//     musicVolume: number;
//     inputMethod: "auto" | "touch" | "mouse";
//     showAimLine: boolean;
//     showPowerMeter: boolean;
//     vibration: boolean;
//     showTutorial: boolean;
//     tableColor: string;
//     difficulty: "easy" | "normal" | "hard";
//     selectedCueId: CueId;
// }
// const COLORS = {
//     color: "#ffd700",
//     stroke: "#635504ff",
// };

// export class SettingsModal extends Modal {
//     private currentSettings: SettingsConfig;
//     private onSaveCallback: ((settings: SettingsConfig) => void) | undefined;
//     private availableCueIds: CueId[] = [];
//     private currentCueIndex: number = 0;

//     constructor(scene: Phaser.Scene, x: number, y: number) {
//         const config: ModalConfig = {
//             width: 550,
//             height: 650,
//             title: "SYSTEM SETTINGS",
//             scrollable: true,
//             scrollHeight: 450,
//             panelColor: 0x0a0a1a,
//             backgroundColor: 0x001100,
//             borderColor: Phaser.Display.Color.HexStringToColor(COLORS.color).color,
//             hotkey: Phaser.Input.Keyboard.KeyCodes.F3,
//         };

//         super(scene, x, y, config);

//         this.currentSettings = {
//             masterVolume: 1,
//             sfxVolume: 1,
//             musicVolume: 0.8,
//             inputMethod: "auto",
//             showAimLine: true,
//             showPowerMeter: true,
//             vibration: true,
//             showTutorial: true,
//             tableColor: "#2a4a2a",
//             difficulty: "normal",
//             selectedCueId: "basic", // Default cue ID
//         };
//         this.availableCueIds = ["basic", "advanced", "expert", "sword", "wooden_sword"];

//         this.createSettingsContent();
//     }

//     private createSettingsContent(): void {
//         const container = this.getContentContainer();
//         const height = this.config.height;
//         let yPosition = -height / 2 + 100;
//         const spacing = 60;
//         const sectionSpacing = 80;

//         // Volume Section
//         this.createSectionTitle(container, "AUDIO SETTINGS", yPosition);
//         yPosition += spacing;

//         this.createVolumeControl(container, "MASTER VOLUME", yPosition, this.currentSettings.masterVolume, (value) => {
//             this.currentSettings.masterVolume = value;
//         });
//         yPosition += spacing;

//         this.createVolumeControl(container, "SFX VOLUME", yPosition, this.currentSettings.sfxVolume, (value) => {
//             this.currentSettings.sfxVolume = value;
//         });
//         yPosition += spacing;

//         this.createVolumeControl(container, "MUSIC VOLUME", yPosition, this.currentSettings.musicVolume, (value) => {
//             this.currentSettings.musicVolume = value;
//         });
//         yPosition += sectionSpacing;

//         // Cue Selection Section
//         this.createSectionTitle(container, "CUE SELECTION", yPosition);
//         yPosition += spacing;

//         this.createCueSelectionUI(container, yPosition);
//         yPosition += 220; // Space for cue display

//         // Gameplay Section
//         this.createSectionTitle(container, "GAMEPLAY", yPosition);
//         yPosition += spacing;

//         this.createToggleControl(container, "SHOW POWER METER", yPosition, this.currentSettings.showPowerMeter, (value) => {
//             this.currentSettings.showPowerMeter = value;
//         });
//         yPosition += spacing;
//         this.createToggleControl(container, "SHOW AIM LINE", yPosition, this.currentSettings.showPowerMeter, (value) => {
//             this.currentSettings.showPowerMeter = value;
//         });

//         this.createActionButtons(container, yPosition + 40);
//     }

//     private createSectionTitle(container: Phaser.GameObjects.Container, text: string, y: number): void {
//         const title = this.scene.add
//             .text(0, y, text, {
//                 fontFamily: '"Courier New", monospace',
//                 fontSize: "22px",
//                 color: COLORS.color,
//                 stroke: COLORS.stroke,
//                 fontStyle: "bold",
//                 strokeThickness: 3,
//                 shadow: {
//                     offsetX: 2,
//                     offsetY: 2,
//                     color: "#000",
//                     blur: 0,
//                     fill: true,
//                 },
//             })
//             .setOrigin(0.5);

//         // Add underline
//         const underline = this.scene.add.graphics();
//         underline.lineStyle(2, Phaser.Display.Color.HexStringToColor(COLORS.color).color, 0.6);
//         underline.beginPath();
//         underline.moveTo(-150, y + 25);
//         underline.lineTo(150, y + 25);
//         underline.strokePath();

//         container.add(title);
//         container.add(underline);
//     }

//     private createVolumeControl(
//         container: Phaser.GameObjects.Container,
//         label: string,
//         y: number,
//         initialValue: number,
//         onChange: (value: number) => void
//     ): void {
//         const normalizedValue = initialValue / 10;

//         const slider = new SliderControl(
//             this.scene,
//             10,
//             y,
//             label,
//             normalizedValue,
//             (value: number) => {
//                 onChange(Math.round(value));
//             },
//             200,
//             30,
//             COLORS.color,
//             (value) => {
//                 return 0xffd700;
//             }
//         );

//         container.add(slider);
//     }
//     private createToggleControl(
//         container: Phaser.GameObjects.Container,
//         label: string,
//         y: number,
//         initialValue: boolean,
//         onChange: (value: boolean) => void
//     ): void {
//         const toggle = new ToggleControl(
//             this.scene,
//             0,
//             y,
//             label,
//             initialValue,
//             (value: boolean) => {
//                 onChange(value);
//             },
//             {
//                 labelColor: COLORS.color,
//                 colorOnBorder: 0x669900,
//                 colorOnText: COLORS.color,
//                 colorOnBg: 0x669900,
//                 colorOffBg: 0x660000,
//             }
//         );
//         container.add(toggle);
//     }

//     private createCueSelectionUI(container: Phaser.GameObjects.Container, y: number): void {
//         const cueContainer = this.scene.add.container(0, y);
//         const { width, height } = this.config;

//         const PADDING = 50;
//         const boxWidth = width - PADDING * 2;
//         const originX = -(width / 2);

//         const cueBox = this.scene.add.graphics();
//         cueBox.fillStyle(0x000000, 0.3);
//         cueBox.fillRoundedRect(originX + PADDING, 0, boxWidth, 100, 10);
//         cueBox.lineStyle(2, Phaser.Display.Color.HexStringToColor(COLORS.color).color, 1);
//         cueBox.strokeRoundedRect(originX + PADDING, 0, boxWidth, 100, 10);

//         cueContainer.add(cueBox);

//         const cueData = CUE_DATA[this.availableCueIds[this.currentCueIndex]!];
//         const cueImage = this.scene.add.image(0, 50, cueData.spriteId).setOrigin(0.5).setDisplaySize(300, 150);

//         cueContainer.add(cueImage);

//         container.add(cueContainer);

//         const updateCueDisplay = () => {
//             const cueData = CUE_DATA[this.availableCueIds[this.currentCueIndex]!];
//             const displayName = cueData.id.replace("cue-", "").toLowerCase();
//             cueImage.setTexture(cueData.spriteId);
//             this.currentSettings.selectedCueId = displayName as CueId;
//             console.log(this.currentSettings.selectedCueId);
//         };

//         this.createCueNavigationButtons(cueContainer, 150, updateCueDisplay);

//         updateCueDisplay();
//     }

//     private createCueNavigationButtons(container: Phaser.GameObjects.Container, y: number, onUpdate: () => void): void {
//         const buttonStyle = {
//             fontFamily: '"Courier New", monospace',
//             fontSize: "24px",
//             color: COLORS.color,
//             backgroundColor: "#002200",
//             padding: { x: 15, y: 8 },
//             stroke: "#00aa00",
//             strokeThickness: 2,
//         };

//         // Left arrow button
//         const leftButton = this.scene.add
//             .text(-120, y, "◀", {
//                 ...buttonStyle,
//                 fontSize: "28px",
//             })
//             .setOrigin(0.5)
//             .setInteractive({ useHandCursor: true });

//         // Right arrow button
//         const rightButton = this.scene.add
//             .text(120, y, "▶", {
//                 ...buttonStyle,
//                 fontSize: "28px",
//             })
//             .setOrigin(0.5)
//             .setInteractive({ useHandCursor: true });

//         [leftButton, rightButton].forEach((button) => {
//             button.on("pointerover", () => {
//                 button.setStyle({
//                     ...buttonStyle,
//                     color: "#ffff00",
//                     backgroundColor: "#006600",
//                     stroke: "#ffff00",
//                 });
//             });

//             button.on("pointerout", () => {
//                 button.setStyle(buttonStyle);
//             });

//             button.on("pointerdown", () => {
//                 button.setStyle({
//                     ...buttonStyle,
//                     color: "#000000",
//                     backgroundColor: "#00ff00",
//                     stroke: "#000000",
//                 });
//             });

//             button.on("pointerup", () => {
//                 button.setStyle(buttonStyle);
//             });
//         });

//         leftButton.on("pointerdown", () => {
//             this.currentCueIndex = (this.currentCueIndex - 1 + this.availableCueIds.length) % this.availableCueIds.length;
//             onUpdate();
//         });

//         rightButton.on("pointerdown", () => {
//             this.currentCueIndex = (this.currentCueIndex + 1) % this.availableCueIds.length;
//             onUpdate();
//         });

//         container.add(leftButton);
//         container.add(rightButton);
//     }

//     private createActionButtons(container: Phaser.GameObjects.Container, y: number): void {
//         const buttonStyle = {
//             fontFamily: '"Courier New", monospace',
//             fontSize: "20px",
//             color: "#ffffff",
//             backgroundColor: "#004400",
//             padding: { x: 25, y: 10 },
//             stroke: "#00ff00",
//             strokeThickness: 2,
//         };

//         // Save button
//         const saveButton = this.scene.add
//             .text(-80, y, "SAVE", buttonStyle)
//             .setOrigin(0.5)
//             .setInteractive({ useHandCursor: true });

//         saveButton.on("pointerover", () => {
//             saveButton.setStyle({
//                 color: "#ffff00",
//                 backgroundColor: "#006600",
//                 stroke: "#ffff00",
//             });
//         });

//         saveButton.on("pointerout", () => {
//             saveButton.setStyle(buttonStyle);
//         });

//         saveButton.on("pointerdown", () => {
//             saveButton.setStyle({
//                 color: "#000000",
//                 backgroundColor: "#00ff00",
//                 stroke: "#000000",
//             });
//             this.onSave();
//         });

//         container.add(saveButton);

//         // Reset button
//         const resetButton = this.scene.add
//             .text(80, y, "RESET", {
//                 ...buttonStyle,
//                 backgroundColor: "#440000",
//                 stroke: "#ff0000",
//             })
//             .setOrigin(0.5)
//             .setInteractive({ useHandCursor: true });

//         resetButton.on("pointerover", () => {
//             resetButton.setStyle({
//                 color: "#ffff00",
//                 backgroundColor: "#660000",
//                 stroke: "#ff8800",
//             });
//         });

//         resetButton.on("pointerout", () => {
//             resetButton.setStyle({
//                 ...buttonStyle,
//                 backgroundColor: "#440000",
//                 stroke: "#ff0000",
//             });
//         });

//         resetButton.on("pointerdown", () => {
//             resetButton.setStyle({
//                 color: "#000000",
//                 backgroundColor: "#ff0000",
//                 stroke: "#000000",
//             });
//             this.resetToDefaults();
//         });

//         container.add(resetButton);
//     }

//     private resetToDefaults(): void {
//         this.currentSettings = {
//             masterVolume: 1,
//             sfxVolume: 1,
//             musicVolume: 0.8,
//             inputMethod: "auto",
//             showAimLine: true,
//             showPowerMeter: true,
//             vibration: true,
//             showTutorial: true,
//             tableColor: "#2a4a2a",
//             difficulty: "normal",
//             selectedCueId: "basic",
//         };

//         this.updateAllUIElements();
//     }

//     private updateAllUIElements(): void {
//         // TODO : Implement updating all UI elements
//     }

//     private onSave(): void {
//         this.onSaveCallback && this.onSaveCallback(this.currentSettings);

//         this.scene.time.delayedCall(300, () => {
//             this.hide();
//         });
//     }

//     public getCurrentSettings(): SettingsConfig {
//         return { ...this.currentSettings };
//     }

//     public override show(): void {
//         super.show();
//     }
// }
