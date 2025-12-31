import * as Phaser from "phaser";

export class ToggleControl extends Phaser.GameObjects.Container {
    private toggleBg!: Phaser.GameObjects.Rectangle;
    private toggleKnob!: Phaser.GameObjects.Arc;
    private toggleText!: Phaser.GameObjects.Text;
    private labelText!: Phaser.GameObjects.Text;
    private interactiveArea!: Phaser.GameObjects.Rectangle;

    private currentValue: boolean;
    private onChange: (value: boolean) => void;

    private toggleWidth: number;
    private toggleHeight: number;
    private toggleBorder: number;
    private knobRadius: number;
    private knobOffset: number;
    private interactiveWidth: number;
    private interactiveHeight: number;

    private colorOnBg: number;
    private colorOffBg: number;
    private colorOnBorder: number;
    private colorOffBorder: number;
    private colorKnob: number;
    private colorKnobBorder: number;
    private colorOnText: string;
    private colorOffText: string;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        label: string,
        initialValue: boolean,
        onChange: (value: boolean) => void,
        options: {
            toggleWidth?: number;
            toggleHeight?: number;
            toggleBorder?: number;
            knobRadius?: number;
            interactiveWidth?: number;
            interactiveHeight?: number;
            colorOnBg?: number;
            colorOffBg?: number;
            colorOnBorder?: number;
            colorOffBorder?: number;
            colorKnob?: number;
            colorKnobBorder?: number;
            colorOnText?: string;
            colorOffText?: string;
            labelFontSize?: string;
            labelColor?: string;
            labelX?: number;
            toggleX?: number;
            textFontSize?: string;
        } = {}
    ) {
        super(scene, x, y);

        this.currentValue = initialValue;
        this.onChange = onChange;

        this.toggleWidth = options.toggleWidth || 60;
        this.toggleHeight = options.toggleHeight || 30;
        this.toggleBorder = options.toggleBorder || 2;
        this.knobRadius = options.knobRadius || 10;
        this.knobOffset = this.toggleWidth / 2 - this.knobRadius - this.toggleBorder;
        this.interactiveWidth = options.interactiveWidth || 80;
        this.interactiveHeight = options.interactiveHeight || 40;

        this.colorOnBg = options.colorOnBg || 0x004400;
        this.colorOffBg = options.colorOffBg || 0x440000;
        this.colorOnBorder = options.colorOnBorder || 0x00ff00;
        this.colorOffBorder = options.colorOffBorder || 0xff0000;
        this.colorKnob = options.colorKnob || 0xffffff;
        this.colorKnobBorder = options.colorKnobBorder || 0x000000;
        this.colorOnText = options.colorOnText || "#00ff00";
        this.colorOffText = options.colorOffText || "#ff0000";

        this.createToggle(label, options);
        this.setupInteractive();

        scene.add.existing(this);
    }

    private createToggle(label: string, options: any): void {
        const labelX = options.labelX || -140;
        const toggleX = options.toggleX || 100;
        const labelFontSize = options.labelFontSize || "18px";
        const labelColor = options.labelColor || "#00ff00";
        const textFontSize = options.textFontSize || "14px";

        this.labelText = this.scene.add
            .text(labelX, 0, label, {
                fontFamily: '"Courier New", monospace',
                fontSize: labelFontSize,
                color: labelColor,
            })
            .setOrigin(0, 0.5);
        this.add(this.labelText);

        this.toggleBg = this.scene.add.rectangle(
            toggleX,
            0,
            this.toggleWidth,
            this.toggleHeight,
            this.currentValue ? this.colorOnBg : this.colorOffBg,
            1
        );
        this.toggleBg.setStrokeStyle(this.toggleBorder, this.currentValue ? this.colorOnBorder : this.colorOffBorder, 1);
        this.add(this.toggleBg);

        const knobX = toggleX + (this.currentValue ? this.knobOffset : -this.knobOffset);
        this.toggleKnob = this.scene.add.circle(knobX, 0, this.knobRadius, this.colorKnob);
        this.toggleKnob.setStrokeStyle(this.toggleBorder, this.colorKnobBorder, 1);
        this.add(this.toggleKnob);

        this.toggleText = this.scene.add
            .text(toggleX, 0, this.currentValue ? "ON" : "OFF", {
                fontFamily: '"Courier New", monospace',
                fontSize: textFontSize,
                color: this.currentValue ? this.colorOnText : this.colorOffText,
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        this.add(this.toggleText);

        this.interactiveArea = this.scene.add
            .rectangle(toggleX, 0, this.interactiveWidth, this.interactiveHeight, 0x000000, 0)
            .setOrigin(0.5);
        this.add(this.interactiveArea);
    }

    private setupInteractive(): void {
        this.interactiveArea.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
            this.toggle();
        });
    }

    public toggle(skipCallback: boolean = false): void {
        this.setValue(!this.currentValue, skipCallback);
    }

    public setValue(value: boolean, skipCallback: boolean = false): void {
        this.currentValue = value;

        this.toggleBg.fillColor = value ? this.colorOnBg : this.colorOffBg;
        this.toggleBg.strokeColor = value ? this.colorOnBorder : this.colorOffBorder;

        const toggleX = this.toggleBg.x;
        this.toggleKnob.x = toggleX + (value ? this.knobOffset : -this.knobOffset);

        this.toggleText.setText(value ? "ON" : "OFF");
        this.toggleText.setColor(value ? this.colorOnText : this.colorOffText);

        if (!skipCallback && this.onChange) {
            this.onChange(value);
        }
    }

    public getValue(): boolean {
        return this.currentValue;
    }

    public setLabel(newLabel: string): void {
        this.labelText.setText(newLabel);
    }

    public setTextLabels(onText: string, offText: string): void {
        if (this.currentValue) {
            this.toggleText.setText(onText);
        } else {
            this.toggleText.setText(offText);
        }
    }

    public updateColors(options: {
        colorOnBg?: number;
        colorOffBg?: number;
        colorOnBorder?: number;
        colorOffBorder?: number;
        colorKnob?: number;
        colorKnobBorder?: number;
        colorOnText?: string;
        colorOffText?: string;
    }): void {
        if (options.colorOnBg !== undefined) this.colorOnBg = options.colorOnBg;
        if (options.colorOffBg !== undefined) this.colorOffBg = options.colorOffBg;
        if (options.colorOnBorder !== undefined) this.colorOnBorder = options.colorOnBorder;
        if (options.colorOffBorder !== undefined) this.colorOffBorder = options.colorOffBorder;
        if (options.colorKnob !== undefined) this.colorKnob = options.colorKnob;
        if (options.colorKnobBorder !== undefined) this.colorKnobBorder = options.colorKnobBorder;
        if (options.colorOnText !== undefined) this.colorOnText = options.colorOnText;
        if (options.colorOffText !== undefined) this.colorOffText = options.colorOffText;

        this.setValue(this.currentValue, true);
    }

    public override destroy(fromScene?: boolean): void {
        if (this.toggleBg) this.toggleBg.destroy();
        if (this.toggleKnob) this.toggleKnob.destroy();
        if (this.toggleText) this.toggleText.destroy();
        if (this.labelText) this.labelText.destroy();
        if (this.interactiveArea) this.interactiveArea.destroy();
        super.destroy(fromScene);
    }
}
