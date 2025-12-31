import * as Phaser from "phaser";

export class TextInputControl extends Phaser.GameObjects.Container {
    private background!: Phaser.GameObjects.Rectangle;
    private labelText!: Phaser.GameObjects.Text;
    private inputText!: Phaser.GameObjects.Text;
    private placeholderText!: Phaser.GameObjects.Text;
    private cursor!: Phaser.GameObjects.Rectangle;
    private interactiveArea!: Phaser.GameObjects.Rectangle;

    private currentValue: string = "";
    private placeholder: string;
    private isFocused: boolean = false;
    private isPassword: boolean = false;
    private maxLength: number;
    private cursorBlinkTimer: Phaser.Time.TimerEvent | null = null;
    private cursorVisible: boolean = true;

    private padding: number;
    private cursorWidth: number;

    private backgroundColor: number;
    private backgroundAlpha: number;
    private borderColor: number;
    private borderWidth: number;
    private focusedBorderColor: number;
    private textColor: string;
    private placeholderColor: string;
    private cursorColor: number;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        label: string,
        placeholder: string = "",
        initialValue: string = "",
        onChange?: (value: string) => void,
        options: {
            width?: number;
            height?: number;
            padding?: number;
            maxLength?: number;
            isPassword?: boolean;
            backgroundColor?: number;
            backgroundAlpha?: number;
            borderColor?: number;
            borderWidth?: number;
            focusedBorderColor?: number;
            textColor?: string;
            placeholderColor?: string;
            cursorColor?: number;
            cursorWidth?: number;
            labelFontSize?: string;
            labelColor?: string;
            inputFontSize?: string;
            fontFamily?: string;
        } = {}
    ) {
        super(scene, x, y);

        this.placeholder = placeholder;
        this.currentValue = initialValue;

        this.width = options.width || 300;
        this.height = options.height || 40;
        this.padding = options.padding || 10;
        this.cursorWidth = options.cursorWidth || 2;
        this.maxLength = options.maxLength || 100;
        this.isPassword = options.isPassword || false;

        this.backgroundColor = options.backgroundColor || 0x002200;
        this.backgroundAlpha = options.backgroundAlpha || 0.8;
        this.borderColor = options.borderColor || 0x00aa00;
        this.borderWidth = options.borderWidth || 2;
        this.focusedBorderColor = options.focusedBorderColor || 0x00ff00;
        this.textColor = options.textColor || "#00ff00";
        this.placeholderColor = options.placeholderColor || "#888888";
        this.cursorColor = options.cursorColor || 0x00ff00;

        this.createTextInput(label, options);
        this.setupInteractive();
        this.setupKeyboardInput();

        if (onChange) {
            this.onChange = onChange;
        }

        scene.add.existing(this);
    }

    private createTextInput(label: string, options: any): void {
        const labelX = -this.width / 2;
        const inputX = 0;
        const labelFontSize = options.labelFontSize || "16px";
        const labelColor = options.labelColor || "#00ff00";
        const inputFontSize = options.inputFontSize || "18px";
        const fontFamily = options.fontFamily || '"Courier New", monospace';

        // Background
        this.background = this.scene.add.rectangle(
            inputX,
            0,
            this.width,
            this.height,
            this.backgroundColor,
            this.backgroundAlpha
        );
        this.background.setStrokeStyle(this.borderWidth, this.borderColor, 1);
        this.add(this.background);

        // Label
        this.labelText = this.scene.add
            .text(labelX, -this.height, label, {
                fontFamily: fontFamily,
                fontSize: labelFontSize,
                color: labelColor,
            })
            .setOrigin(0, 0.5);
        this.add(this.labelText);

        // Input text
        const textX = inputX - this.width / 2 + this.padding;
        this.inputText = this.scene.add
            .text(textX, 0, this.getDisplayText(), {
                fontFamily: fontFamily,
                fontSize: inputFontSize,
                color: this.textColor,
            })
            .setOrigin(0, 0.5);
        this.add(this.inputText);

        // Placeholder text
        if (this.currentValue === "" && this.placeholder) {
            this.placeholderText = this.scene.add
                .text(textX, 0, this.placeholder, {
                    fontFamily: fontFamily,
                    fontSize: inputFontSize,
                    color: this.placeholderColor,
                    fontStyle: "italic",
                })
                .setOrigin(0, 0.5);
            this.add(this.placeholderText);
        }

        // Cursor
        this.cursor = this.scene.add.rectangle(0, 0, this.cursorWidth, this.height * 0.6, this.cursorColor, 1);
        this.cursor.setOrigin(0.5, 0.5);
        this.cursor.setVisible(false);
        this.add(this.cursor);

        // Interactive area
        this.interactiveArea = this.scene.add.rectangle(inputX, 0, this.width, this.height, 0x000000, 0).setOrigin(0.5);
        this.add(this.interactiveArea);
    }

    private getDisplayText(): string {
        if (this.isPassword && this.currentValue) {
            return "•".repeat(this.currentValue.length);
        }
        return this.currentValue;
    }

    private setupInteractive(): void {
        this.interactiveArea.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
            this.setFocus(true);
        });
    }

    private setupKeyboardInput(): void {
        this.scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
            if (!this.isFocused) return;

            event.preventDefault();

            if (event.key === "Backspace") {
                this.handleBackspace();
            } else if (event.key === "Enter") {
                this.setFocus(false);
            } else if (event.key === "Escape") {
                this.setFocus(false);
            } else if (event.key === "Tab") {
                this.setFocus(false);
            } else if (event.key.length === 1) {
                if (this.currentValue.length < this.maxLength) {
                    this.currentValue += event.key;
                    this.updateDisplay();
                }
            }
        });

        // Handle clicks outside to lose focus
        this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (!this.interactiveArea.getBounds().contains(pointer.x, pointer.y)) {
                this.setFocus(false);
            }
        });
    }

    private handleBackspace(): void {
        if (this.currentValue.length > 0) {
            this.currentValue = this.currentValue.slice(0, -1);
            this.updateDisplay();
        }
    }

    private updateDisplay(): void {
        const displayText = this.getDisplayText();
        this.inputText.setText(displayText);

        if (this.placeholderText) {
            this.placeholderText.setVisible(this.currentValue === "" && !this.isFocused);
        }

        this.updateCursorPosition();

        if (this.onChange) {
            this.onChange(this.currentValue);
        }
    }

    private updateCursorPosition(): void {
        if (this.currentValue === "" && this.placeholderText) {
            this.cursor.x = this.placeholderText.x;
        } else {
            const textWidth = this.inputText.width;
            const startX = this.inputText.x;
            this.cursor.x = startX + textWidth + 2;
        }
        this.cursor.y = this.inputText.y;
    }

    private startCursorBlink(): void {
        if (this.cursorBlinkTimer) {
            this.cursorBlinkTimer.remove();
        }

        this.cursorVisible = true;
        this.cursor.setVisible(true);

        this.cursorBlinkTimer = this.scene.time.addEvent({
            delay: 500,
            callback: () => {
                this.cursorVisible = !this.cursorVisible;
                this.cursor.setVisible(this.cursorVisible);
            },
            loop: true,
        });
    }

    private stopCursorBlink(): void {
        if (this.cursorBlinkTimer) {
            this.cursorBlinkTimer.remove();
            this.cursorBlinkTimer = null;
        }
        this.cursor.setVisible(false);
    }

    public setFocus(focused: boolean): void {
        if (this.isFocused === focused) return;

        this.isFocused = focused;

        if (focused) {
            this.background.strokeColor = this.focusedBorderColor;

            this.startCursorBlink();
            this.updateCursorPosition();

            if (this.placeholderText) {
                this.placeholderText.setVisible(false);
            }
        } else {
            this.background.strokeColor = this.borderColor;

            this.stopCursorBlink();

            if (this.placeholderText && this.currentValue === "") {
                this.placeholderText.setVisible(true);
            }
        }
    }

    public setValue(value: string, skipCallback: boolean = false): void {
        if (value.length > this.maxLength) {
            value = value.substring(0, this.maxLength);
        }

        this.currentValue = value;
        this.updateDisplay();

        if (!skipCallback && this.onChange) {
            this.onChange(value);
        }
    }

    public getValue(): string {
        return this.currentValue;
    }

    public setLabel(newLabel: string): void {
        this.labelText.setText(newLabel);
    }

    public setPlaceholder(newPlaceholder: string): void {
        this.placeholder = newPlaceholder;
        if (this.placeholderText) {
            this.placeholderText.setText(newPlaceholder);
        } else if (this.currentValue === "") {
            // Create placeholder text if it doesn't exist
            const fontFamily = this.inputText.style.fontFamily;
            const fontSize = this.inputText.style.fontSize as string;

            this.placeholderText = this.scene.add
                .text(this.inputText.x, this.inputText.y, newPlaceholder, {
                    fontFamily: fontFamily,
                    fontSize: fontSize,
                    color: this.placeholderColor,
                    fontStyle: "italic",
                })
                .setOrigin(0, 0.5);
            this.add(this.placeholderText);
            this.placeholderText.setVisible(!this.isFocused);
        }
    }

    public setPasswordMode(isPassword: boolean): void {
        this.isPassword = isPassword;
        this.updateDisplay();
    }

    public setMaxLength(maxLength: number): void {
        this.maxLength = maxLength;
        if (this.currentValue.length > maxLength) {
            this.currentValue = this.currentValue.substring(0, maxLength);
            this.updateDisplay();
        }
    }

    public updateColors(options: {
        backgroundColor?: number;
        backgroundAlpha?: number;
        borderColor?: number;
        focusedBorderColor?: number;
        textColor?: string;
        placeholderColor?: string;
        cursorColor?: number;
        labelColor?: string;
    }): void {
        if (options.backgroundColor !== undefined) {
            this.backgroundColor = options.backgroundColor;
            this.background.fillColor = this.backgroundColor;
        }
        if (options.backgroundAlpha !== undefined) {
            this.backgroundAlpha = options.backgroundAlpha;
            this.background.fillAlpha = this.backgroundAlpha;
        }
        if (options.borderColor !== undefined) {
            this.borderColor = options.borderColor;
            if (!this.isFocused) {
                this.background.strokeColor = this.borderColor;
            }
        }
        if (options.focusedBorderColor !== undefined) {
            this.focusedBorderColor = options.focusedBorderColor;
            if (this.isFocused) {
                this.background.strokeColor = this.focusedBorderColor;
            }
        }
        if (options.textColor !== undefined) {
            this.textColor = options.textColor;
            this.inputText.setColor(this.textColor);
        }
        if (options.placeholderColor !== undefined) {
            this.placeholderColor = options.placeholderColor;
            if (this.placeholderText) {
                this.placeholderText.setColor(this.placeholderColor);
            }
        }
        if (options.cursorColor !== undefined) {
            this.cursorColor = options.cursorColor;
            this.cursor.fillColor = this.cursorColor;
        }
        if (options.labelColor !== undefined) {
            this.labelText.setColor(options.labelColor);
        }
    }

    public clear(): void {
        this.setValue("");
    }

    public override destroy(fromScene?: boolean): void {
        this.stopCursorBlink();

        this.scene.input.keyboard?.off("keydown");
        this.scene.input.off("pointerdown");

        if (this.background) this.background.destroy();
        if (this.labelText) this.labelText.destroy();
        if (this.inputText) this.inputText.destroy();
        if (this.placeholderText) this.placeholderText.destroy();
        if (this.cursor) this.cursor.destroy();
        if (this.interactiveArea) this.interactiveArea.destroy();

        super.destroy(fromScene);
    }

    public onChange?: (value: string) => void;
}
