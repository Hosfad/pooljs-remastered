import * as Phaser from "phaser";

export class SliderControl extends Phaser.GameObjects.Container {
    private barBg!: Phaser.GameObjects.Graphics;
    private barFill!: Phaser.GameObjects.Graphics;
    private valueText!: Phaser.GameObjects.Text;
    private labelText!: Phaser.GameObjects.Text;
    private interactiveArea!: Phaser.GameObjects.Rectangle;

    private barWidth: number;
    private barHeight: number;
    private barPadding: number;
    private barStartX!: number;
    private barTopY!: number;
    private fillStartX!: number;
    private fillStartY!: number;
    private fillHeight!: number;

    private currentValue: number;
    private onChange: (value: number) => void;
    private getColor: (value: number) => number;
    private isDragging: boolean = false;
    private strokeColor!: string;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        label: string,
        initialValue: number,
        onChange: (value: number) => void,
        barWidth: number = 200,
        barHeight: number = 30,
        strokeColor: string = "#ffff00",
        getColor?: (value: number) => number
    ) {
        super(scene, x, y);

        this.strokeColor = strokeColor;
        this.currentValue = Phaser.Math.Clamp(initialValue, 0, 1);
        this.onChange = onChange;
        this.barWidth = barWidth;
        this.barHeight = barHeight;
        this.barPadding = 2;

        this.getColor =
            getColor ||
            ((value: number) => {
                const green = Math.floor(0x00 + value * 0xff);
                return (green << 8) | 0x00aa00;
            });

        this.createSlider(label);
        this.setupDragSupport();

        scene.add.existing(this);
    }

    private createSlider(label: string): void {
        const labelX = -180;
        const barX = -60;
        const valueTextX = 180;
        const labelSpacing = -30;

        this.barStartX = barX;
        const barCenterY = 0;
        this.barTopY = barCenterY - this.barHeight / 2;

        this.fillStartX = this.barStartX + this.barPadding;
        this.fillStartY = this.barTopY + this.barPadding;
        this.fillHeight = this.barHeight - this.barPadding * 2;

        this.labelText = this.scene.add
            .text(labelX + labelSpacing, 0, label, {
                fontFamily: '"Courier New", monospace',
                fontSize: "18px",
                color: this.strokeColor,
            })
            .setOrigin(0, 0.5);
        this.add(this.labelText);

        this.barBg = this.scene.add.graphics();
        this.barBg.fillStyle(this.getColor(1), 0.2);
        this.barBg.fillRect(this.barStartX, this.barTopY, this.barWidth, this.barHeight);
        this.barBg.lineStyle(2, this.getColor(1), 0.8);
        this.barBg.strokeRect(this.barStartX, this.barTopY, this.barWidth, this.barHeight);
        this.add(this.barBg);

        const fillWidth = (this.barWidth - this.barPadding * 2) * this.currentValue;
        this.barFill = this.scene.add.graphics();
        this.barFill.fillStyle(this.getColor(this.currentValue), 0.8);
        this.barFill.fillRect(this.fillStartX, this.fillStartY, fillWidth, this.fillHeight);
        this.add(this.barFill);

        this.valueText = this.scene.add
            .text(valueTextX, 0, `${Math.round(this.currentValue * 100)}%`, {
                fontFamily: '"Courier New", monospace',
                fontSize: "18px",
                color: this.strokeColor,
            })
            .setOrigin(0.5);
        this.add(this.valueText);

        this.setInteractive(
            new Phaser.Geom.Rectangle(this.barStartX, this.barTopY, this.barWidth, this.barHeight),
            Phaser.Geom.Rectangle.Contains
        );

        this.input!.cursor = "pointer";
    }

    private setupDragSupport(): void {
        this.on("pointerdown", (pointer: Phaser.Input.Pointer, localX: number, localY: number) => {
            const barRelativeX = localX - this.barStartX;
            this.isDragging = true;
            this.updateValueFromLocalPosition(barRelativeX);
        });

        this.on("pointermove", (pointer: Phaser.Input.Pointer, localX: number, localY: number) => {
            if (this.isDragging && pointer.isDown) {
                const barRelativeX = localX - this.barStartX;
                this.updateValueFromLocalPosition(barRelativeX);
            }
        });

        this.on("pointerup", () => {
            this.isDragging = false;
        });

        this.on("pointerout", () => {
            if (!this.scene.input.activePointer.isDown) {
                this.isDragging = false;
            }
        });

        this.scene.input.on("pointerup", () => {
            this.isDragging = false;
        });
    }

    private updateValueFromLocalPosition(localX: number): void {
        const newValue = Phaser.Math.Clamp(localX / this.barWidth, 0, 1);

        if (Math.abs(newValue - this.currentValue) > 0.001) {
            this.setValue(newValue);
        }
    }

    public setValue(value: number, skipCallback: boolean = false): void {
        const clampedValue = Phaser.Math.Clamp(value, 0, 1);
        this.currentValue = clampedValue;

        const newFillWidth = (this.barWidth - this.barPadding * 2) * clampedValue;
        this.barFill.clear();
        this.barFill.fillStyle(this.getColor(clampedValue), 0.8);
        this.barFill.fillRect(this.fillStartX, this.fillStartY, newFillWidth, this.fillHeight);

        this.valueText.setText(`${Math.round(clampedValue * 100)}%`);

        if (!skipCallback && this.onChange) {
            this.onChange(clampedValue);
        }
    }

    public getValue(): number {
        return this.currentValue;
    }

    public updateColorFunction(getColor: (value: number) => number): void {
        this.getColor = getColor;
        this.barFill.clear();
        this.barFill.fillStyle(this.getColor(this.currentValue), 0.8);
        const fillWidth = (this.barWidth - this.barPadding * 2) * this.currentValue;
        this.barFill.fillRect(this.fillStartX, this.fillStartY, fillWidth, this.fillHeight);
    }

    public setLabel(newLabel: string): void {
        this.labelText.setText(newLabel);
    }

    public setValueFormat(format: (value: number) => string): void {
        this.valueText.setText(format(this.currentValue));
    }

    public override destroy(fromScene?: boolean): void {
        this.scene.input.off("pointermove");
        this.scene.input.off("pointerup");

        if (this.barBg) this.barBg.destroy();
        if (this.barFill) this.barFill.destroy();
        if (this.valueText) this.valueText.destroy();
        if (this.labelText) this.labelText.destroy();
        if (this.interactiveArea) this.interactiveArea.destroy();
        super.destroy(fromScene);
    }
}
