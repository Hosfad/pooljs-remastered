import * as Phaser from "phaser";
import { setGlobalModalOpenVariable } from "../../../common/pool-constants";

export interface ModalConfig {
    width?: number;
    height?: number;
    title?: string;
    hasCloseButton?: boolean;
    backgroundColor?: number;
    backgroundAlpha?: number;
    borderColor?: number;
    borderThickness?: number;
    cornerRadius?: number;
    panelColor?: number;
    panelAlpha?: number;
    titleColor?: string;
    titleSize?: string;
    accentColor?: string;
    scrollable?: boolean;
    scrollHeight?: number;
    drawBackground?: boolean;
    hotkey?: typeof Phaser.Input.Keyboard.KeyCodes[keyof typeof Phaser.Input.Keyboard.KeyCodes];
    disableBackgroundClicks?: boolean;
    drawGrid?: boolean;
}

export class Modal extends Phaser.GameObjects.Container {
    protected panel!: Phaser.GameObjects.Rectangle;
    protected titleText!: Phaser.GameObjects.Text;
    protected contentContainer!: Phaser.GameObjects.Container;
    protected config: Required<Omit<ModalConfig, "hotkey">> & {
        hotkey?: typeof Phaser.Input.Keyboard.KeyCodes[keyof typeof Phaser.Input.Keyboard.KeyCodes];
    }; // UPDATED
    private hotkey?: Phaser.Input.Keyboard.Key;

    private onCloseCallback?: () => void;
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };
    private blockingBackground!: Phaser.GameObjects.Rectangle;
    private inputPlugin: Phaser.Input.InputPlugin;
    private sceneWidth: number;
    private sceneHeight: number;

    private isOpenVar = false;
    constructor(scene: Phaser.Scene, x: number, y: number, config: ModalConfig = {}, onClose?: () => void) {
        super(scene, x, y);

        this.sceneWidth = scene.scale.width;
        this.sceneHeight = scene.scale.height;
        this.inputPlugin = scene.input;

        this.config = {
            width: 600,
            height: 600,
            title: "MODAL",
            hasCloseButton: true,
            backgroundColor: 0x000000,
            backgroundAlpha: 0.7,
            borderColor: 0x8b4513,
            borderThickness: 4,
            cornerRadius: 15,
            panelColor: 0x1a1a1a,
            panelAlpha: 0.95,
            titleColor: "#ffd700",
            titleSize: "28px",
            accentColor: "#ffd700",
            scrollable: false,
            scrollHeight: 300,
            drawBackground: true,
            hotkey: undefined,
            disableBackgroundClicks: false,
            drawGrid: true,
            ...config,
        };

        this.onCloseCallback = onClose;

        if (this.config.hotkey !== undefined) {
            this.hotkey = this.scene.input.keyboard?.addKey(this.config.hotkey);
            this.hotkey?.on("down", () => {
                this.toggle();
            });
        }

        this.createModal();
        this.setVisible(false);
        this.setDepth(9999);

        scene.add.existing(this);
    }
    public isOpen(): boolean {
        return this.isOpenVar;
    }
    protected createModal(): void {
        if (this.config.drawBackground) {
            this.createBlockingBackground();
        }

        this.createRetroBackground();
        this.createMainPanel();
        this.createTitle();
        this.createContentContainer();
        this.makeDraggable();
    }

    protected createBlockingBackground(): void {
        this.blockingBackground = this.scene.add.rectangle(
            this.sceneWidth / 2,
            this.sceneHeight / 2,
            this.sceneWidth,
            this.sceneHeight,
            0x000000,
            0.5
        );

        this.blockingBackground.setInteractive();
        this.blockingBackground.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.config.disableBackgroundClicks) return;
            this.hide();
        });

        this.blockingBackground.setDepth(9998);
        this.blockingBackground.setVisible(false);
    }

    protected createRetroBackground(): void {
        const { backgroundColor, backgroundAlpha } = this.config;

        const background = this.scene.add.graphics();
        background.fillStyle(backgroundColor, backgroundAlpha);
        background.fillRect(
            -this.config.width / 2 - 10,
            -this.config.height / 2 - 10,
            this.config.width + 20,
            this.config.height + 20
        );

        background.lineStyle(1, 0x00ff00, 0.1);
        for (let y = -this.config.height / 2; y < this.config.height / 2; y += 4) {
            background.beginPath();
            background.moveTo(-this.config.width / 2, y);
            background.lineTo(this.config.width / 2, y);
            background.strokePath();
        }

        this.add(background);
    }

    protected createMainPanel(): void {
        const { width, height, borderColor, borderThickness, cornerRadius, panelColor, panelAlpha } = this.config;

        const outerBorder = this.scene.add.graphics();
        outerBorder.fillStyle(0x4a2500, 1);
        outerBorder.fillRoundedRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, cornerRadius + 5);
        this.add(outerBorder);

        const innerBevel = this.scene.add.graphics();
        innerBevel.lineStyle(2, 0xdeb887, 0.8);
        innerBevel.strokeRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, cornerRadius - 2);
        this.add(innerBevel);

        this.panel = this.scene.add.rectangle(0, 0, width, height, panelColor, panelAlpha);
        this.panel.setStrokeStyle(borderThickness, borderColor, 1);
        this.panel.setInteractive({ useHandCursor: true });
        this.add(this.panel);

        if (this.config.drawGrid) this.addPanelTexture();
    }

    protected addPanelTexture(): void {
        const { width, height } = this.config;

        const grid = this.scene.add.graphics();
        grid.lineStyle(1, 0x2a2a2a, 0.3);

        for (let x = -width / 2 + 20; x < width / 2; x += 40) {
            grid.beginPath();
            grid.moveTo(x, -height / 2);
            grid.lineTo(x, height / 2);
            grid.strokePath();
        }

        for (let y = -height / 2 + 20; y < height / 2; y += 40) {
            grid.beginPath();
            grid.moveTo(-width / 2, y);
            grid.lineTo(width / 2, y);
            grid.strokePath();
        }

        this.add(grid);

        this.addCornerDecorations();
    }

    protected addCornerDecorations(): void {
        const { width, height, accentColor } = this.config;
        const cornerSize = 20;

        const corners = this.scene.add.graphics();
        corners.lineStyle(3, Phaser.Display.Color.HexStringToColor(accentColor).color, 1);

        // Top-left
        corners.beginPath();
        corners.moveTo(-width / 2 + 10, -height / 2 + 10);
        corners.lineTo(-width / 2 + 10, -height / 2 + cornerSize);
        corners.lineTo(-width / 2 + cornerSize, -height / 2 + 10);
        corners.strokePath();

        // Top-right
        corners.beginPath();
        corners.moveTo(width / 2 - 10, -height / 2 + 10);
        corners.lineTo(width / 2 - 10, -height / 2 + cornerSize);
        corners.lineTo(width / 2 - cornerSize, -height / 2 + 10);
        corners.strokePath();

        // Bottom-left
        corners.beginPath();
        corners.moveTo(-width / 2 + 10, height / 2 - 10);
        corners.lineTo(-width / 2 + 10, height / 2 - cornerSize);
        corners.lineTo(-width / 2 + cornerSize, height / 2 - 10);
        corners.strokePath();

        // Bottom-right
        corners.beginPath();
        corners.moveTo(width / 2 - 10, height / 2 - 10);
        corners.lineTo(width / 2 - 10, height / 2 - cornerSize);
        corners.lineTo(width / 2 - cornerSize, height / 2 - 10);
        corners.strokePath();

        this.add(corners);
    }

    protected createTitle(): void {
        const { width, height, title, titleColor, titleSize } = this.config;

        // Title text with retro font effect
        this.titleText = this.scene.add
            .text(0, -height / 2 + 25, title, {
                fontFamily: '"Courier New", monospace',
                fontSize: titleSize,
                color: titleColor,
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 4,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: "#000",
                    blur: 0,
                    fill: true,
                },
            })
            .setOrigin(0.5);

        // Add blinking cursor effect
        const cursor = this.scene.add
            .text(this.titleText.width / 2 + 10, -height / 2 + 25, "_", {
                fontFamily: '"Courier New", monospace',
                fontSize: titleSize,
                color: this.config.titleColor,
            })
            .setOrigin(0.5);

        this.scene.tweens.add({
            targets: cursor,
            alpha: 0,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });

        this.add(this.titleText);
        this.add(cursor);
    }

    protected createContentContainer(): void {
        const { width, height, scrollable, scrollHeight } = this.config;

        this.contentContainer = this.scene.add.container(0, 0);
        this.contentContainer.setDepth(1000);
        // if (DEBUG_GRAPHICS) {
        //     this.contentContainer.add(this.scene.add.rectangle(0, 0, width, height, 0xffffff, 0.5));
        //     this.contentContainer.setInteractive();
        // }

        this.add(this.contentContainer);
    }

    protected makeDraggable(): void {
        const { width, height } = this.config;

        // Make title bar draggable - use the title text area
        const titleBar = this.scene.add.rectangle(0, -height / 2 + 25, width, 50, 0x000000, 0);
        titleBar.setInteractive({ useHandCursor: true });

        titleBar.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            this.isDragging = true;
            this.dragOffset.x = this.x - pointer.worldX;
            this.dragOffset.y = this.y - pointer.worldY;
        });

        titleBar.on("pointerup", () => {
            this.isDragging = false;
        });

        titleBar.on("pointerout", () => {
            // Only stop dragging if pointer leaves the title bar while dragging
            if (this.isDragging && !this.scene.input.activePointer.isDown) {
                this.isDragging = false;
            }
        });

        // Add global pointer move handler for dragging
        this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging && pointer.isDown) {
                this.x = pointer.worldX + this.dragOffset.x;
                this.y = pointer.worldY + this.dragOffset.y;
            }
        });

        this.add(titleBar);
    }

    public show(): void {
        if (!this.config.disableBackgroundClicks) setGlobalModalOpenVariable(true);
        this.isOpenVar = true;
        if (this.config.drawBackground && this.blockingBackground) {
            this.blockingBackground.setVisible(true);
            this.blockingBackground.setActive(true);
        }

        this.setVisible(true);
        this.setActive(true);

        this.inputPlugin.enabled = false;

        if (this.x === 0 && this.y === 0) {
            this.x = this.sceneWidth / 2;
            this.y = this.sceneHeight / 2;
        }

        this.setScale(0.5);
        this.setAlpha(0);

        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 300,
            ease: "Back.easeOut",
            onComplete: () => {
                this.setInteractive();
            },
        });
    }

    public hide(): void {
        if (!this.config.disableBackgroundClicks) setGlobalModalOpenVariable(false);
        this.isOpenVar = false;
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.8,
            scaleY: 0.8,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.setVisible(false);
                this.setActive(false);
                this.disableInteractive();

                if (this.blockingBackground) {
                    this.blockingBackground.setVisible(false);
                    this.blockingBackground.setActive(false);
                }

                this.inputPlugin.enabled = true;
            },
        });
    }

    public toggle(): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    public setTitle(title: string): void {
        this.titleText.setText(title);
    }

    public addContent(content: Phaser.GameObjects.GameObject): void {
        this.contentContainer.add(content);
    }

    public clearContent(): void {
        this.contentContainer.removeAll(true);
    }

    public getContentContainer(): Phaser.GameObjects.Container {
        return this.contentContainer;
    }

    public setOnClose(callback: () => void): void {
        this.onCloseCallback = callback;
    }

    public resizeModal(width: number, height: number): void {
        const oldWidth = this.config.width;
        const oldHeight = this.config.height;

        this.config.width = width;
        this.config.height = height;

        if (this.panel) {
            this.panel.setSize(width, height);
            this.panel.setInteractive({ useHandCursor: true }); // Reset hit area
        }

        this.updateRetroBackground();
        this.updateBordersAndBevels();
        this.updateTitlePosition();
        this.updateGridAndCorners();
        this.updateDraggableArea();

        // Update content container positioning if needed
        this.contentContainer.setPosition(0, 0);

        // Reposition modal to stay centered if it was centered
        const wasCentered = Math.abs(this.x - this.sceneWidth / 2) < 10 && Math.abs(this.y - this.sceneHeight / 2) < 10;
        if (wasCentered) {
            this.x = this.sceneWidth / 2;
            this.y = this.sceneHeight / 2;
        }
    }

    protected updateRetroBackground(): void {
        const retroBackground = this.list.find(
            (child) => child instanceof Phaser.GameObjects.Graphics
        ) as Phaser.GameObjects.Graphics;

        if (retroBackground) {
            retroBackground.clear();
            const { backgroundColor, backgroundAlpha, width, height } = this.config;

            retroBackground.fillStyle(backgroundColor, backgroundAlpha);
            retroBackground.fillRect(-width / 2 - 10, -height / 2 - 10, width + 20, height + 20);

            retroBackground.lineStyle(1, 0x00ff00, 0.1);
            for (let y = -height / 2; y < height / 2; y += 4) {
                retroBackground.beginPath();
                retroBackground.moveTo(-width / 2, y);
                retroBackground.lineTo(width / 2, y);
                retroBackground.strokePath();
            }
        }
    }

    protected updateBordersAndBevels(): void {
        const { width, height, borderColor, borderThickness, cornerRadius, panelColor, panelAlpha } = this.config;

        const outerBorder = this.list.find(
            (child) => child instanceof Phaser.GameObjects.Graphics
        ) as Phaser.GameObjects.Graphics;

        if (outerBorder) {
            outerBorder.clear();
            outerBorder.fillStyle(0x4a2500, 1);
            outerBorder.fillRoundedRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, cornerRadius + 5);
        }

        const innerBevel = this.list.find(
            (child) => child instanceof Phaser.GameObjects.Graphics
        ) as Phaser.GameObjects.Graphics;

        if (innerBevel) {
            innerBevel.clear();
            innerBevel.lineStyle(2, 0xdeb887, 0.8);
            innerBevel.strokeRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, cornerRadius - 2);
        }

        if (this.panel) {
            this.panel.setStrokeStyle(borderThickness, borderColor, 1);
        }
    }

    protected updateTitlePosition(): void {
        const { height } = this.config;
        if (this.titleText) {
            this.titleText.setPosition(0, -height / 2 + 25);

            // Update cursor position
            const cursor = this.list.find(
                (child) => child instanceof Phaser.GameObjects.Text && child.text === "_"
            ) as Phaser.GameObjects.Text;

            if (cursor) {
                cursor.setPosition(this.titleText.width / 2 + 10, -height / 2 + 25);
            }
        }
    }

    protected updateGridAndCorners(): void {
        if (!this.config.drawGrid) return;

        const gridGraphics = this.list.filter((child) => child instanceof Phaser.GameObjects.Graphics);

        const cornerGraphics = this.list.filter((child) => child instanceof Phaser.GameObjects.Graphics);

        gridGraphics.forEach((g) => this.remove(g, true));
        cornerGraphics.forEach((g) => this.remove(g, true));

        this.addPanelTexture();
    }

    protected updateDraggableArea(): void {
        const existingTitleBar = this.list.find(
            (child) => child instanceof Phaser.GameObjects.Rectangle && child.fillColor === 0 && child.fillAlpha === 0
        );

        if (existingTitleBar) {
            this.remove(existingTitleBar, true);
        }

        const { width, height } = this.config;
        const titleBar = this.scene.add.rectangle(0, -height / 2 + 25, width, 50, 0x000000, 0);
        titleBar.setInteractive({ useHandCursor: true });

        titleBar.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            this.isDragging = true;
            this.dragOffset.x = this.x - pointer.worldX;
            this.dragOffset.y = this.y - pointer.worldY;
        });

        titleBar.on("pointerup", () => {
            this.isDragging = false;
        });

        titleBar.on("pointerout", () => {
            if (this.isDragging && !this.scene.input.activePointer.isDown) {
                this.isDragging = false;
            }
        });

        this.add(titleBar);
    }
    public updateSize(width: number, height: number): void {
        this.contentContainer.setSize(width, height);
    }

    public override destroy(fromScene?: boolean): void {
        if (this.hotkey) {
            this.hotkey.off("down");
            this.scene.input.keyboard?.removeKey(this.hotkey);
        }

        if (this.blockingBackground) {
            this.blockingBackground.destroy();
        }

        this.scene.input.off("pointermove");

        if (this.visible) {
            this.inputPlugin.enabled = true;
        }

        super.destroy(fromScene);
    }
}
