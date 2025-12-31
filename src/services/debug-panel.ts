import * as Phaser from "phaser";
import { POOL_TABLE_WIDTH } from "../common/pool-constants";

type DebugConfigRecord = Record<string, () => string | number | boolean>;
type CommandArg = {
    name: string;
    type: string | number | boolean;
    autofillOptions: string[];
};
type CommandArgType = CommandArg["type"];

type DebugPanelCommand = {
    name: string;
    args: CommandArg[];
    execute: (args?: CommandArgType[]) => void;
};

export class DebugPanel {
    private logs: string[] = [];
    private readonly MAX_LOGS = 100;
    private scrollOffset = 0;

    private text!: Phaser.GameObjects.Text;
    private scrollIndicator!: Phaser.GameObjects.Text;

    private readonly COLLAPSED_VISIBLE_LOGS = 8;
    private readonly EXPANDED_VISIBLE_LOGS = 18;
    private readonly COLUMN_WIDTH = 80;

    private visibleLogs = this.COLLAPSED_VISIBLE_LOGS;

    private originalLog = console.log;
    private originalWarn = console.warn;
    private originalError = console.error;

    private inputBg!: Phaser.GameObjects.Graphics;
    private inputField!: Phaser.GameObjects.Text;
    private inputCursor!: Phaser.GameObjects.Rectangle;
    private inputVisible = false;
    private inputText = "";
    private cursorVisible = true;
    private cursorTimer = 0;
    private readonly CURSOR_BLINK_INTERVAL = 500;
    private closeButton!: Phaser.GameObjects.Text;
    private keyboardPlugin!: Phaser.Input.Keyboard.KeyboardPlugin;

    private cursorPosition = 0;

    private commands: DebugPanelCommand[] = [];
    private history: string[] = [];
    private historyIndex = -1;

    private expandButton!: Phaser.GameObjects.Text;
    private clearButton!: Phaser.GameObjects.Text;
    private scrollUpButton!: Phaser.GameObjects.Text;
    private scrollDownButton!: Phaser.GameObjects.Text;
    private isExpanded = false;

    private originalPosition = { x: 0, y: 0 };
    private originalSize = { width: 0, height: 0 };

    constructor(
        private scene: Phaser.Scene,
        private config: DebugConfigRecord,
        private size: { width: number; height: number; } = { width: POOL_TABLE_WIDTH, height: 200 },
        private position: { x: number; y: number; } = { x: 0, y: 0 }
    ) {
        this.scene = scene;
        this.config = config;
        this.size = size;
        this.position = position ?? { x: 0, y: 0 };
        this.originalPosition = { ...this.position };
        this.originalSize = { ...this.size };
        this.overrideConsole();
        this.createUI();
        this.createInputUI();
        this.registerInput();
        this.registerCommands();
        console.log("Debug panel initialized", config);
    }

    private registerCommands() {
        this.commands = [
            {
                name: "eval",
                args: [{ name: "code", type: "string", autofillOptions: Object.keys(globalThis) }],
                execute: (args?: CommandArgType[]) => {
                    console.log(eval((args || []).join(" ")));
                },
            },
            {
                name: "echo",
                args: [{ name: "message", type: "string", autofillOptions: [] }],
                execute: (args?: CommandArgType[]) => {
                    console.error((args || []).join(" "));
                },
            },
            {
                name: "clear",
                args: [],
                execute: () => {
                    this.logs = [];
                    console.log("Logs cleared");
                },
            },
            {
                name: "config",
                args: [],
                execute: () => {
                    console.log("=== CONFIG VALUES ===");
                    Object.entries(this.config).forEach(([key, getter]) => {
                        console.log(`${key}: ${getter()}`);
                    });
                },
            },
        ];

        const helpCommand = {
            name: "help",
            args: [
                {
                    name: "command",
                    type: "string",
                    autofillOptions: this.commands.map((cmd) => cmd.name),
                },
            ],
            execute: () => {
                console.log("============");
                this.commands.forEach((cmd) => {
                    const argStr = cmd.args
                        .map((arg) => {
                            if (arg.autofillOptions.length > 0) {
                                return `<${arg.name}:${arg.type} [${arg.autofillOptions.join("|")}]>`;
                            }
                            return `<${arg.name}:${arg.type}>`;
                        })
                        .join(" ");
                    console.log(`- ${cmd.name} ${argStr}`);
                });
                console.log("Press TAB to autocomplete current argument");
                console.log("=== AVAILABLE COMMANDS ===");
            },
        };

        this.commands.push(helpCommand);
    }

    private overrideConsole() {
        const pushLog = (prefix: string, args: any[]) => {
            const msg = prefix + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
            this.logs.push(msg);
            if (this.logs.length > this.MAX_LOGS) this.logs.shift();
        };

        console.log = (...args: any[]) => {
            this.originalLog(...args);
            pushLog("", args);
        };

        console.warn = (...args: any[]) => {
            this.originalWarn(...args);
            pushLog("[WARN] ", args);
        };

        console.error = (...args: any[]) => {
            this.originalError(...args);
            pushLog("[ERROR] ", args);
        };
    }

    private createUI() {
        const { width, height } = this.size;
        const { x, y } = this.position!;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.85);
        bg.fillRect(x, y, width, height);
        bg.lineStyle(2, 0x00ff00, 0.6);
        bg.strokeRect(x, y, width, height);
        bg.setDepth(100);
        (this as any).bg = bg;
        this.text = this.scene.add.text(10, y + 10, "", {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#00ff00",
            wordWrap: { width: width - 20 },
        });
        this.text.setDepth(100);

        this.scrollIndicator = this.scene.add.text(width - 120, y + height - 25, "", {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#00ff00",
        });
        this.scrollIndicator.setDepth(100);

        this.clearButton = this.scene.add
            .text(width - 120, y + 10, "[ 🗑 Clear Logs]", {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#00ff00",
            })
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => (this.logs = []))
            .setDepth(100);

        this.expandButton = this.scene.add
            .text(width - 120, y + 25, `[ ${this.isExpanded ? "- Collapse" : "+ Expand"}]`, {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#00ff00",
            })
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                this.toggleExpand();
            })
            .setDepth(100);

        this.scrollUpButton = this.scene.add
            .text(width - 120, y + 50, "[ ↑ Scroll Up]", {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#00ff00",
            })
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => (this.scrollOffset = 0))
            .setDepth(100);

        this.scrollDownButton = this.scene.add
            .text(width - 120, y + 65, "[ ↓ Scroll Down]", {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#00ff00",
            })
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => (this.scrollOffset = this.getMaxScroll()))
            .setDepth(100);
    }

    private toggleExpand() {
        this.isExpanded = !this.isExpanded;
        this.expandButton.setText(`[ ${this.isExpanded ? "- Collapse" : "+ Expand"}]`);

        this.visibleLogs = this.isExpanded ? this.EXPANDED_VISIBLE_LOGS : this.COLLAPSED_VISIBLE_LOGS;

        this.size.height = this.isExpanded ? this.originalSize.height * 2 : this.originalSize.height;
        this.position.y = this.isExpanded ? this.originalPosition.y - this.originalSize.height : this.originalPosition.y;

        this.updateUIPositions();

        if (this.logs.length <= this.visibleLogs) {
            this.scrollOffset = 0;
        }
    }

    private createInputUI() {
        const { width, height } = this.size;
        const { x, y } = this.position!;

        const INPUT_Y = y + height - 40;

        this.inputBg = this.scene.add.graphics();
        this.inputBg.fillStyle(0x000000, 0.9);
        this.inputBg.fillRect(0, INPUT_Y, width, 40);
        this.inputBg.lineStyle(2, 0x00ff00, 1);
        this.inputBg.strokeRect(0, INPUT_Y, width, 40);
        this.inputBg.setVisible(false);
        this.inputBg.setDepth(100);

        this.inputField = this.scene.add.text(10, INPUT_Y + 10, "", {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#00ff00",
            padding: { x: 5, y: 3 },
        });
        this.inputField.setVisible(false);
        this.inputField.setDepth(100);

        this.inputCursor = this.scene.add.rectangle(this.inputField.x + 5, INPUT_Y + 10, 2, 20, 0x00ff00);
        this.inputCursor.setOrigin(0, 0);
        this.inputCursor.setVisible(false);
        this.inputCursor.setDepth(100);

        this.closeButton = this.scene.add
            .text(width - 40, INPUT_Y + 10, "[X]", {
                fontFamily: "monospace",
                fontSize: "16px",
                color: "#ff0000",
                backgroundColor: "#111111",
                padding: { x: 4, y: 2 },
            })
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.hideInput());
        this.closeButton.setVisible(false);
        this.closeButton.setDepth(100);
    }

    private showInput() {
        this.inputVisible = true;
        this.inputBg.setVisible(true);
        this.inputField.setVisible(true);
        this.closeButton.setVisible(true);
        this.inputCursor.setVisible(true);
        this.cursorVisible = true;
        this.cursorTimer = 0;

        this.cursorPosition = this.inputText.length;

        this.updateInputDisplay();
        this.scene.input.keyboard?.enableGlobalCapture();
    }

    private resetInput() {
        this.inputText = "";
        this.cursorPosition = 0;
        this.updateInputDisplay();
    }

    private hideInput() {
        this.inputVisible = false;
        this.inputBg.setVisible(false);
        this.inputField.setVisible(false);
        this.closeButton.setVisible(false);
        this.inputCursor.setVisible(false);

        this.inputText = "";
        this.cursorPosition = 0;
        this.scene.input.keyboard?.disableGlobalCapture();
    }

    private updateInputDisplay() {
        const displayText = this.inputText || "Enter debug command...";
        const textColor = this.inputText ? "#00ff00" : "#666666";

        this.inputField.setText(displayText);
        this.inputField.setStyle({ color: textColor });

        // Calculate cursor position based on text before cursor
        const textBeforeCursor = this.inputText.substring(0, this.cursorPosition);
        const tempText = this.scene.add.text(0, 0, textBeforeCursor, {
            fontFamily: "monospace",
            fontSize: "16px",
        });
        const textWidth = tempText.width;
        tempText.destroy();

        this.inputCursor.x = this.inputField.x + textWidth + 2;

        // Blink cursor
        const now = Date.now();
        if (now - this.cursorTimer > this.CURSOR_BLINK_INTERVAL) {
            this.cursorVisible = !this.cursorVisible;
            this.inputCursor.setVisible(this.cursorVisible && this.inputVisible);
            this.cursorTimer = now;
        }
    }

    private findHighestMatchingPrefix(matches: string[]): string {
        const smallest = matches.reduce((acc, m) => (m.length < acc.length ? m : acc));

        let i = 0;
        let prefix = "";
        while (matches.every((m) => m.startsWith(prefix + smallest[i]!))) {
            prefix += smallest[i++]!;
        }

        return prefix;
    }

    private autocompleteCurrentArgument() {
        const parts = this.inputText.split(" ");
        const commandName = parts[0]?.toLowerCase();

        // Find the current word being typed (at cursor position)
        const words = this.inputText.split(" ");

        let charCount = 0;
        let currentWordIndex = 0;
        let currentWordStart = 0;

        for (let i = 0; i < words.length; i++) {
            charCount += words[i]!.length + 1; // +1 for space
            if (charCount > this.cursorPosition) {
                currentWordIndex = i;
                currentWordStart = charCount - words[i]!.length - 1;
                break;
            }
        }

        const currentWord = words[currentWordIndex] || "";

        if (currentWordIndex === 0) {
            const matchingCommands = this.commands
                .filter((cmd) => cmd.name.startsWith(currentWord.toLowerCase()))
                .map(cmd => cmd.name);

            const prefix = this.findHighestMatchingPrefix(matchingCommands);

            if (prefix.length > currentWord.length) {
                words[0] = prefix;
                this.inputText = words.join(" ");
                this.cursorPosition = prefix.length;
                this.updateInputDisplay();
            }

            if (matchingCommands.length > 1) {
                console.log(`Commands: ${matchingCommands.join(", ")}`);
            }

            return;
        }

        const command = this.commands.find((cmd) => cmd.name === commandName);
        if (!command) return;

        // Check if we're on an argument for this command
        const argIndex = currentWordIndex - 1;
        if (argIndex < command.args.length) {
            const argDef = command.args[argIndex];
            if (!argDef) return;

            const options = [...argDef.autofillOptions];
            const matchingOptions = options.filter((opt) => opt.toLowerCase().startsWith(currentWord.toLowerCase()));
            const prefix = this.findHighestMatchingPrefix(matchingOptions);

            if (prefix.length > currentWord.length) {
                words[currentWordIndex] = prefix;
                this.inputText = words.join(" ");
                this.cursorPosition = currentWordStart + prefix.length;
                this.updateInputDisplay();
            }

            if (matchingOptions.length > 1) {
                console.log(`${matchingOptions.join(", ")}`);
            }
        }
    }

    private executeCommand(command: string) {
        const trimmed = command.trim();
        if (!trimmed) return;

        this.history.push(trimmed);
        this.historyIndex = this.history.length;

        const parts = trimmed.split(" ");
        const cmdName = parts[0]?.toLowerCase();
        const args = parts.slice(1);

        const commandDef = this.commands.find((cmd) => cmd.name === cmdName);
        if (!commandDef) return console.log(`Unknown command: ${cmdName}. Type 'help' for available commands.`);
        if (args.length < commandDef.args.length) {
            console.log(`Error: ${commandDef.name} requires ${commandDef.args.length} arguments`);
            console.log(`Usage: ${commandDef.name} ${commandDef.args.map((arg) => `<${arg.name}:${arg.type}>`).join(" ")}`);
            return;
        }

        const typedArgs = args.map((arg, index) => {
            const argDef = commandDef.args[index];
            if (!argDef) return arg;

            switch (argDef.type) {
                case "number":
                    return parseFloat(arg);
                case "boolean":
                    return arg.toLowerCase() === "true" || arg === "1";
                default:
                    return arg;
            }
        });

        try {
            commandDef.execute(typedArgs);
        } catch (error) {
            console.log(`Error executing ${cmdName}: ${error}`);
        }
    }

    private registerInput() {
        this.keyboardPlugin = this.scene.input.keyboard!;

        // Register all needed keys
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.F2);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.HOME);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.END);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyboardPlugin.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

        this.keyboardPlugin.on("keydown", (event: KeyboardEvent) => {
            if (event.key === "F2") {
                event.preventDefault();
                if (this.inputVisible) {
                    this.hideInput();
                } else {
                    this.showInput();
                }
                return;
            }

            if (!this.inputVisible) return;

            event.preventDefault();

            if (event.key === "Enter") {
                if (this.inputText.trim()) {
                    this.executeCommand(this.inputText);
                }
                this.resetInput();
                return;
            }

            if (event.key === "Escape") {
                this.hideInput();
                return;
            }

            if (event.key === "Tab") {
                event.preventDefault();
                this.autocompleteCurrentArgument();
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                if (this.history.length > 0) {
                    this.historyIndex = Math.max(0, this.historyIndex - 1);
                    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
                        this.inputText = this.history[this.historyIndex]!;
                        this.cursorPosition = this.inputText.length;
                        this.updateInputDisplay();
                    }
                }
                return;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                if (this.history.length > 0) {
                    this.historyIndex = Math.min(this.history.length, this.historyIndex + 1);
                    if (this.historyIndex < this.history.length) {
                        this.inputText = this.history[this.historyIndex]!;
                    } else {
                        this.inputText = "";
                    }
                    this.cursorPosition = this.inputText.length;
                    this.updateInputDisplay();
                }
                return;
            }

            switch (event.key) {
                case "ArrowLeft":
                    if (this.cursorPosition > 0) {
                        this.cursorPosition--;
                        this.updateInputDisplay();
                    }
                    return;

                case "ArrowRight":
                    if (this.cursorPosition < this.inputText.length) {
                        this.cursorPosition++;
                        this.updateInputDisplay();
                    }
                    return;

                case "Home":
                    this.cursorPosition = 0;
                    this.updateInputDisplay();
                    return;

                case "End":
                    this.cursorPosition = this.inputText.length;
                    this.updateInputDisplay();
                    return;

                case "Backspace":
                    if (this.cursorPosition > 0) {
                        this.inputText =
                            this.inputText.substring(0, this.cursorPosition - 1) +
                            this.inputText.substring(this.cursorPosition);
                        this.cursorPosition--;
                        this.updateInputDisplay();
                    }
                    return;

                case "Delete":
                    if (this.cursorPosition < this.inputText.length) {
                        this.inputText =
                            this.inputText.substring(0, this.cursorPosition) +
                            this.inputText.substring(this.cursorPosition + 1);
                        this.updateInputDisplay();
                    }
                    return;
            }

            if (event.key.length === 1) {
                let char = event.key;

                if (event.shiftKey && char >= "a" && char <= "z") {
                    char = char.toUpperCase();
                } else if (!event.shiftKey && char >= "A" && char <= "Z") {
                    char = char.toLowerCase();
                }

                if (event.shiftKey) {
                    const shiftMap: Record<string, string> = {
                        "1": "!",
                        "2": "@",
                        "3": "#",
                        "4": "$",
                        "5": "%",
                        "6": "^",
                        "7": "&",
                        "8": "*",
                        "9": "(",
                        "0": ")",
                        "-": "_",
                        "=": "+",
                        "[": "{",
                        "]": "}",
                        "\\": "|",
                        ";": ":",
                        "'": '"',
                        ",": "<",
                        ".": ">",
                        "/": "?",
                        "`": "~",
                    };
                    char = shiftMap[char] || char;
                }

                this.inputText =
                    this.inputText.substring(0, this.cursorPosition) + char + this.inputText.substring(this.cursorPosition);
                this.cursorPosition++;
                this.updateInputDisplay();
            } else if (event.key === " ") {
                this.inputText =
                    this.inputText.substring(0, this.cursorPosition) + " " + this.inputText.substring(this.cursorPosition);
                this.cursorPosition++;
                this.updateInputDisplay();
            }
        });

        this.scene.input.on("wheel", (_: any, __: any, ___: number, deltaY: number) => {
            this.scrollOffset += Math.sign(deltaY);
            this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.getMaxScroll());
        });
    }

    private getMaxScroll() {
        return Math.max(0, this.logs.length - this.visibleLogs);
    }

    update() {
        if (this.inputVisible) {
            const now = Date.now();
            if (now - this.cursorTimer > this.CURSOR_BLINK_INTERVAL) {
                this.cursorVisible = !this.cursorVisible;
                this.inputCursor.setVisible(this.cursorVisible);
                this.cursorTimer = now;
            }
        }

        const configLines = ["=== CONFIG ===", ...Object.entries(this.config).map(([key, getter]) => `${key}: ${getter()}`)];

        const start = Math.max(0, this.logs.length - this.visibleLogs - this.scrollOffset);
        const end = this.logs.length - this.scrollOffset;

        let logLines = ["=== CONSOLE ===", ...this.logs.slice(start, end).reverse()];

        const maxScroll = this.getMaxScroll();
        if (this.scrollOffset > 0 && maxScroll > 0) {
            this.scrollIndicator.setText(`↑ ${this.scrollOffset}/${maxScroll} ↓`);
            logLines.splice(1, 0, `--- ↑ ${this.scrollOffset} more above ---`);
        } else {
            this.scrollIndicator.setText(this.logs.length > this.visibleLogs ? `Scroll ↑ (${maxScroll})` : "");
        }

        const maxLines = Math.max(configLines.length, logLines.length);
        const lines: string[] = [];

        for (let i = 0; i < maxLines; i++) {
            const left = (logLines[i] ?? "").padEnd(this.COLUMN_WIDTH, " ");
            const right = configLines[i] ?? "";
            lines.push(left + right);
        }

        this.text.setText(lines.join("\n"));
    }

    private updateUIPositions() {
        const { width, height } = this.size;
        const { x, y } = this.position;

        const bg = (this as any).bg;
        if (bg) {
            bg.clear();
            bg.fillStyle(0x000000, 0.85);
            bg.fillRect(x, y, width, height);
            bg.lineStyle(2, 0x00ff00, 0.6);
            bg.strokeRect(x, y, width, height);
        }

        this.text.setPosition(10, y + 10);
        this.text.setWordWrapWidth(width - 20); // Update word wrap width

        this.scrollIndicator.setPosition(width - 120, y + height - 25);

        this.clearButton.setPosition(width - 120, y + 10);
        this.expandButton.setPosition(width - 120, y + 25);
        this.scrollUpButton.setPosition(width - 120, y + 50);
        this.scrollDownButton.setPosition(width - 120, y + 65);

        this.updateInputUIPosition();
    }

    private updateInputUIPosition() {
        const { width, height } = this.size;
        const { x, y } = this.position;

        const INPUT_Y = y + height - 40;

        this.inputBg.clear();
        this.inputBg.fillStyle(0x000000, 0.9);
        this.inputBg.fillRect(x, INPUT_Y, width, 40);
        this.inputBg.lineStyle(2, 0x00ff00, 1);
        this.inputBg.strokeRect(x, INPUT_Y, width, 40);

        // Update input field
        this.inputField.setPosition(x + 10, INPUT_Y + 10);

        // Update close button
        this.closeButton.setPosition(x + width - 40, INPUT_Y + 10);

        // Update cursor position
        this.inputCursor.setPosition(this.inputField.x + 5, INPUT_Y + 10);
        this.updateInputDisplay();
    }

    destroy() {
        console.log = this.originalLog;
        console.warn = this.originalWarn;
        console.error = this.originalError;
        this.hideInput();

        if (this.keyboardPlugin) {
            this.keyboardPlugin.off("keydown");
        }
    }
}
