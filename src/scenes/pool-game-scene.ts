/**
 * Main pool game scene - handles game logic, rendering, and physics
 */

import * as Phaser from "phaser";
import {
    BALL_RADIUS,
    DEBUG_GRAPHICS,
    HOLE_RADIUS,
    MODAL_OPEN,
    POOL_ASSETS,
    POOL_SCENE_KEYS,
} from "../common/pool-constants";
import { type Ball, type Collider, type Cue, type Hole, type KeyPositions } from "../common/pool-types";
import { PoolService } from "../services/pool-service";
import { SettingsModal } from "./components/settings-modal";
import { DebugPanel } from "./debug-panel";

const Vector2 = Phaser.Math.Vector2;

export class PoolGameScene extends Phaser.Scene {
    private debugPanel?: DebugPanel;
    private service!: PoolService;
    private keyPositions: KeyPositions = [];

    // Game state
    private balls: Ball[] = [];
    private holes: Hole[] = [];
    private cue!: Cue;
    private colliders: Collider[] = [];

    // Dynamic dimensions based on device scale
    private tableWidth!: number;
    private tableHeight!: number;
    private marginX!: number;
    private marginY!: number;

    private powerMeter!: {
        background: Phaser.GameObjects.Graphics;
        fill: Phaser.GameObjects.Graphics;
        handle: Phaser.GameObjects.Sprite;
        isDragging: boolean;
        power: number;
    };

    // Graphics
    private background!: Phaser.GameObjects.Image;
    private playerTurn!: Phaser.GameObjects.Text;
    private holeBalls: Phaser.GameObjects.Sprite[] = [];
    private playedSounds: (number | undefined)[] = [];

    private settingsButton: Phaser.GameObjects.Text | undefined;
    private settingsModal!: SettingsModal;

    // Input state
    private mousePosition = new Vector2();
    private isDraggingShot = false;
    private dragStartPosition = new Vector2();
    private lockedAimAngle = 0;
    private dragVector = new Vector2();
    private aimLine!: Phaser.GameObjects.Graphics;
    private lastCuePosition = { x: 0, y: 0, rotation: 0 };
    private isMobile = false;

    constructor() {
        super({ key: POOL_SCENE_KEYS.POOL_GAME });
    }

    public create(): void {
        this.isMobile = this.game.device.input.touch;

        // Calculate dimensions based on device scale with margins
        this.calculateTableDimensions();

        if (DEBUG_GRAPHICS) this.setupDebugPanel();

        // Center the table on the screen
        this.background = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, POOL_ASSETS.BACKGROUND);
        this.background.setDisplaySize(this.tableWidth, this.tableHeight);

        // Initialize game objects
        this.createHoles();
        this.createColliders();
        this.createBalls();
        this.createCue();
        this.createPowerMeter();
        this.createUI();

        // Setup input
        this.setupInput();

        this.service = new PoolService(this.balls, this.colliders, this.holes);
        console.log("Pool game initialized with", this.balls.length, "balls");
    }

    private calculateTableDimensions(): void {
        const canvas = this.game.scale.canvas;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const marginPercentage = 0.1;
        const maxMargin = 100;

        this.marginX = Math.min(canvasWidth * marginPercentage, maxMargin);
        this.marginY = Math.min(canvasHeight * marginPercentage, maxMargin);

        const availableWidth = canvasWidth - 2 * this.marginX;
        const availableHeight = canvasHeight - 2 * this.marginY;

        // Maintain the original table aspect ratio
        const originalAspectRatio = 16 / 10;
        const availableAspectRatio = availableWidth / availableHeight;

        if (availableAspectRatio > originalAspectRatio) {
            this.tableHeight = availableHeight;
            this.tableWidth = this.tableHeight * originalAspectRatio;
        } else {
            this.tableWidth = availableWidth;
            this.tableHeight = this.tableWidth / originalAspectRatio;
        }

        // Center the table
        this.marginX = (canvasWidth - this.tableWidth) / 2;
        this.marginY = (canvasHeight - this.tableHeight) / 2;

        console.log(
            `Canvas: ${canvasWidth}x${canvasHeight}, Table: ${this.tableWidth}x${this.tableHeight}, Margin: ${this.marginX},${this.marginY}`
        );
    }

    private toTableCoordinates(x: number, y: number): { x: number; y: number } {
        return {
            x: this.marginX + x,
            y: this.marginY + y,
        };
    }

    public override update(): void {
        this.input.enabled = !this.keyPositions.length;

        const turn = this.service.whoseTurn().toUpperCase();
        if (!this.balls[this.balls.length - 2]?.phaserSprite.visible) {
            this.playerTurn.setText(this.service.winner() ? `${turn} WINS!` : `${turn} LOSES!`);
        } else {
            this.playerTurn.setText(`Is ${turn} turn!`);
        }

        this.updateCue();
        this.updateKeyPositions();
        this.debugPanel?.update();
    }

    private createUI() {
        this.settingsModal = new SettingsModal(this, this.cameras.main.centerX, this.cameras.main.centerY);

        const tableCenter = this.toTableCoordinates(this.tableWidth / 2, this.tableHeight / 4);
        this.playerTurn = this.add
            .text(tableCenter.x, tableCenter.y, "PLAYER TURN", {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#00ff00",
                fontStyle: "bold",
            })
            .setOrigin(0.5, 0.5);

        for (let i = 0; i < this.balls.length - 1; i++) {
            const ball = this.balls[i]!;
            const sprite = ball.phaserSprite;

            const w = BALL_RADIUS * 2;
            const position = this.toTableCoordinates(this.tableWidth / 5 + w * i, this.tableHeight / 20);
            const spr = this.add.sprite(position.x, position.y, sprite.texture).setAlpha(0.5).setOrigin(0.5, 0.5);

            this.holeBalls.push(spr);
        }
        const buttonStyle = {
            fontFamily: '"Courier New", monospace',
            fontSize: "20px",
            color: "#ffd700",
            backgroundColor: "#4a3520",
            padding: { x: 15, y: 10 },
            stroke: "#8b4513",
            strokeThickness: 2,
        };

        const buttonPosition = this.toTableCoordinates(this.tableWidth - 100, 30);
        this.settingsButton = this.add
            .text(buttonPosition.x, buttonPosition.y, "⚙️ SETTINGS", buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(100);

        this.setupButtonHover(this.settingsButton, () => {
            this.settingsModal.show();
        });
    }

    private createBalls() {
        const ROWS = 3;
        const r = BALL_RADIUS;
        const DIAMETER = r * 2;
        const ROW_SPACING = DIAMETER * 0.8;
        const COL_SPACING = DIAMETER * 0.8;

        const rackOrigin = { x: this.tableWidth / 4, y: this.tableHeight / 2 };

        // --- Create racked balls (triangle) ---
        for (let row = 0; row < ROWS; row++) {
            const ballsInRow = ROWS - row;
            const x = rackOrigin.x + row * COL_SPACING;
            const startY = rackOrigin.y - ((ballsInRow - 1) * ROW_SPACING) / 2;

            for (let i = 0; i < ballsInRow; i++) {
                const isSolid = i % 2 === 0;
                const ballType = isSolid ? "yellow" : "red";
                const texture = isSolid ? POOL_ASSETS.SOLID_BALL : POOL_ASSETS.STRIPED_BALL;

                const y = startY + i * ROW_SPACING;
                this.createBall(x, y, ballType, texture);
            }
        }

        const eightBall = this.balls[this.balls.length - 1]!;
        eightBall.ballType = "black";
        eightBall.phaserSprite.setTexture(POOL_ASSETS.BLACK_BALL);

        //  whiteball ball ---
        const cueX = this.tableWidth * 0.75;
        const cueY = rackOrigin.y;

        this.createBall(cueX, cueY, "white", POOL_ASSETS.WHITE_BALL);

        console.log("Created", this.balls.length, "balls");
    }

    private createCue(): void {
        this.aimLine = this.add.graphics();

        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = this.toTableCoordinates(whiteBall.phaserSprite.x, whiteBall.phaserSprite.y);
        const cueSprite = this.add.sprite(x, y, POOL_ASSETS.CUE_STICK);
        cueSprite.setOrigin(1, 0.5);

        this.cue = { phaserSprite: cueSprite, rotation: 0, power: 0 };
    }

    private createColliders(): void {
        const CUSHION_CONSTANTS = {
            SIDE_INNER_X: 0.2, // Inner edge x position
            SIDE_OUTER_X: 1.0, // Outer edge x position
            SIDE_THICKNESS_X: 0, // Thickness in x direction
            SIDE_TOP_Y: 0.8, // Top inset
            SIDE_BOTTOM_Y: 1.8, // Bottom inset

            // Top/bottom cushion dimensions (horizontal rails)
            RAIL_OUTER_Y: 0.2, // Outer edge y position
            RAIL_INNER_Y: 1.3, // Inner edge y position
            RAIL_THICKNESS_Y: 1.1, // Thickness in y direction (RAIL_INNER_Y - RAIL_OUTER_Y adjusted)
            RAIL_SIDE_X: 0.6, // Side inset
            RAIL_CORNER_X: 1.4, // Corner diagonal inset
            RAIL_POCKET_OUTER: 2.09, // Outer pocket edge divisor
            RAIL_POCKET_INNER: 2.05, // Inner pocket edge divisor
        };

        const xRatio = this.tableWidth / 16;
        const yRatio = this.tableHeight / 12;

        const createMirroredColliders = () => {
            // LEFT CUSHION (vertical rail)
            const leftCushion = {
                points: [
                    {
                        x: xRatio * CUSHION_CONSTANTS.SIDE_INNER_X,
                        y: yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y,
                    },
                    {
                        x: xRatio * (CUSHION_CONSTANTS.SIDE_OUTER_X - CUSHION_CONSTANTS.SIDE_THICKNESS_X),
                        y: yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y,
                    },
                    {
                        x: xRatio * (CUSHION_CONSTANTS.SIDE_OUTER_X - CUSHION_CONSTANTS.SIDE_THICKNESS_X),
                        y: this.tableHeight - yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y,
                    },
                    {
                        x: xRatio * CUSHION_CONSTANTS.SIDE_INNER_X,
                        y: this.tableHeight - yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y,
                    },
                ],
                normal: new Vector2(1, 0),
            };

            const rightCushion = {
                points: leftCushion.points.map((p) => ({
                    x: this.tableWidth - p.x,
                    y: p.y,
                })),
                normal: new Vector2(-1, 0),
            };

            const topLeftCushion = {
                points: [
                    {
                        x: xRatio * CUSHION_CONSTANTS.RAIL_SIDE_X,
                        y: yRatio * CUSHION_CONSTANTS.RAIL_OUTER_Y,
                    },
                    {
                        x: xRatio * CUSHION_CONSTANTS.RAIL_CORNER_X,
                        y: yRatio * (CUSHION_CONSTANTS.RAIL_OUTER_Y + CUSHION_CONSTANTS.RAIL_THICKNESS_Y),
                    },
                    {
                        x: this.tableWidth / CUSHION_CONSTANTS.RAIL_POCKET_OUTER,
                        y: yRatio * (CUSHION_CONSTANTS.RAIL_OUTER_Y + CUSHION_CONSTANTS.RAIL_THICKNESS_Y),
                    },
                    {
                        x: this.tableWidth / CUSHION_CONSTANTS.RAIL_POCKET_INNER,
                        y: yRatio * CUSHION_CONSTANTS.RAIL_OUTER_Y,
                    },
                ],
                normal: new Vector2(0, 1),
            };

            const bottomLeftCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: p.x,
                    y: this.tableHeight - p.y,
                })),
                normal: new Vector2(0, -1),
            };

            const topRightCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: this.tableWidth - p.x,
                    y: p.y,
                })),
                normal: new Vector2(0, 1),
            };

            const bottomRightCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: this.tableWidth - p.x,
                    y: this.tableHeight - p.y,
                })),
                normal: new Vector2(0, -1),
            };

            return [leftCushion, rightCushion, topLeftCushion, bottomLeftCushion, topRightCushion, bottomRightCushion];
        };

        const colliderDefinitions = createMirroredColliders();

        colliderDefinitions.forEach((def) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xff0000, 0.5);
            graphics.beginPath();

            const firstPoint = this.toTableCoordinates(def.points[0]!.x, def.points[0]!.y);
            graphics.moveTo(firstPoint.x, firstPoint.y);

            for (let i = 1; i < def.points.length; i++) {
                const point = this.toTableCoordinates(def.points[i]!.x, def.points[i]!.y);
                graphics.lineTo(point.x, point.y);
            }

            graphics.closePath();
            graphics.fillPath();

            const adjustedPoints = def.points.map((p) => this.toTableCoordinates(p.x, p.y));
            const collider: Collider = {
                sprite: {
                    position: new Vector2(adjustedPoints[0]!.x, adjustedPoints[0]!.y),
                    size: { points: adjustedPoints.map((p) => new Vector2(p.x, p.y)) },
                    normal: def.normal,
                    color: "brown",
                    visible: true,
                },
                phaserGraphics: graphics,
            };

            this.colliders.push(collider);
        });

        console.log("Created", this.colliders.length, "colliders");
    }

    private createPowerMeter(): void {
        // Position power meter relative to the table
        const powerMeterX = this.marginX + this.tableWidth / 2;
        const powerMeterY = this.marginY + this.tableHeight - 100;
        const powerMeterWidth = 40;
        const powerMeterHeight = 200;
        const handleHeight = 30;
        const minY = powerMeterY;
        const maxY = powerMeterY + powerMeterHeight - handleHeight;

        // Background of power meter
        const background = this.add.graphics();
        background.fillStyle(0x1a1a1a, 0.9);
        background.fillRoundedRect(powerMeterX - powerMeterWidth / 2, powerMeterY, powerMeterWidth, powerMeterHeight, 10);
        background.lineStyle(3, 0x4a3520, 1);
        background.strokeRoundedRect(powerMeterX - powerMeterWidth / 2, powerMeterY, powerMeterWidth, powerMeterHeight, 10);

        const fill = this.add.graphics();
        const handle = this.add.sprite(powerMeterX, minY + handleHeight / 2, POOL_ASSETS.DRAG_ICON);
        handle.setScale(0.05);
        handle.setRotation(Math.PI / 2);
        handle.setInteractive({ draggable: true, useHandCursor: true });

        // Add power label
        this.add.text(powerMeterX - powerMeterWidth / 2, powerMeterY - 30, "POWER", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#d4af37",
            fontStyle: "bold",
        });

        this.powerMeter = {
            background,
            fill,
            handle,
            isDragging: false,
            power: 0,
        };

        // Setup drag events
        handle.on("dragstart", () => {
            if (MODAL_OPEN) return;
            this.powerMeter.isDragging = true;
        });

        handle.on("dragend", () => {
            if (MODAL_OPEN) return;
            if (this.powerMeter.power <= 0) {
                this.powerMeter.isDragging = false;
                return;
            }

            this.powerMeter.isDragging = false;
            this.keyPositions = this.service.hitBalls(this.powerMeter.power, this.cue.rotation);
            this.setPower(0);
        });

        handle.on("drag", (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
            if (MODAL_OPEN) return;

            const usableHeight = maxY - minY - handleHeight;
            const clampedY = Phaser.Math.Clamp(dragY, minY + handleHeight / 2, maxY - handleHeight / 2);
            const power = (clampedY - (minY + handleHeight / 2)) / usableHeight;
            this.setPower(power);
        });
        this.updatePowerMeterFromPower();
    }

    private updatePowerMeterFromPower(): void {
        const powerMeterX = this.marginX + this.tableWidth / 2;
        const powerMeterY = this.marginY + this.tableHeight - 100;
        const powerMeterWidth = 40;
        const powerMeterHeight = 200;
        const handleHeight = 30;
        const minY = powerMeterY;
        const maxY = powerMeterY + powerMeterHeight - handleHeight;

        const { power, fill, handle } = this.powerMeter;
        const usableHeight = maxY - minY - handleHeight;
        const handleY = minY + handleHeight / 2 + usableHeight * power;
        handle.y = handleY;

        fill.clear();

        if (power <= 0) return;

        let color = 0x00ff00;
        if (power > 0.66) color = 0xff0000;
        else if (power > 0.33) color = 0xffff00;

        const fillHeight = usableHeight * power;
        fill.fillStyle(color, 0.7);
        fill.fillRoundedRect(powerMeterX - powerMeterWidth / 2 + 5, minY + 5, powerMeterWidth - 10, fillHeight, 5);
    }

    private isTouchingPowerMeter(pointer: Phaser.Input.Pointer): boolean {
        const handleBounds = this.powerMeter.handle.getBounds();
        return (
            pointer.x >= handleBounds.x &&
            pointer.x <= handleBounds.x + handleBounds.width &&
            pointer.y >= handleBounds.y &&
            pointer.y <= handleBounds.y + handleBounds.height
        );
    }

    private setPower(power: number): void {
        this.powerMeter.power = power;
        this.updatePowerMeterFromPower();
    }

    private updateKeyPositions(): void {
        if (!this.keyPositions.length) return;

        const frame = this.keyPositions.shift()!;

        frame.forEach((key, i) => {
            const sprite = this.balls[i]!.phaserSprite;
            if (!sprite.visible && i < this.balls.length - 1) return;

            const pos = key.position;
            sprite.setPosition(pos.x, pos.y);
            sprite.visible = !key.hidden;

            if (key.hidden) this.holeBalls[i]?.setAlpha(1);

            if (this.playedSounds[i] === undefined && key.collision !== undefined) {
                switch (key.collision) {
                    case 'wall':
                        this.sound.play(POOL_ASSETS.SOUND_EFFECTS.BALL_HITTING_TABLE_EDGE);
                        break;
                    case 'ball':
                        this.sound.play(POOL_ASSETS.SOUND_EFFECTS.CUE_HIT_WHITE_BALL);
                        break;
                    case 'hole':
                        this.sound.play(POOL_ASSETS.SOUND_EFFECTS.BALL_FALLING_INTO_POCKET);
                        break;
                }
                this.sound.addListener('stop', () => { this.playedSounds[i] = undefined; }, { once: true });
            }
        });
    }

    private createBall(x: number, y: number, ballType: Ball["ballType"], texture: string) {
        const r = BALL_RADIUS;
        const position = this.toTableCoordinates(x, y);

        const sprite = this.add.sprite(position.x, position.y, texture);
        sprite.setScale((r * 2) / sprite.width);

        const ball: Ball = {
            ballType,
            phaserSprite: sprite,
        };

        this.balls.push(ball);
    }

    private createHoles(): void {
        const ratio = this.tableWidth / 16;
        const hRatio = this.tableHeight / 12;

        const leftHolesX = ratio * 0.8;
        const topLeftHoleY = hRatio;
        const bottomLeftHoleY = this.tableHeight - topLeftHoleY;

        const rightColliderX = this.tableWidth - leftHolesX;
        const topRightHoleY = topLeftHoleY;
        const bottomRightHoleY = bottomLeftHoleY;

        const centerHolesX = this.tableWidth / 2;
        const centerHolesYOffset = 20;

        const holePositions = [
            { x: leftHolesX, y: topLeftHoleY },
            { x: leftHolesX, y: bottomLeftHoleY },
            { x: rightColliderX, y: topRightHoleY },
            { x: rightColliderX, y: bottomRightHoleY },
            { x: centerHolesX, y: topLeftHoleY - centerHolesYOffset },
            { x: centerHolesX, y: bottomLeftHoleY + centerHolesYOffset },
        ];

        holePositions.forEach((pos) => {
            const position = this.toTableCoordinates(pos.x, pos.y);

            let graphics: Phaser.GameObjects.Graphics | undefined;

            if (DEBUG_GRAPHICS) {
                graphics = this.add.graphics();
                graphics.fillStyle(0x008000, 0.8);
                graphics.fillCircle(position.x, position.y, HOLE_RADIUS);
            }

            const hole: Hole = {
                sprite: {
                    position: new Vector2(position.x, position.y),
                    color: "green",
                    size: { r: HOLE_RADIUS },
                    visible: true,
                },
                phaserGraphics: graphics,
            };
            this.holes.push(hole);
        });

        console.log("Created", this.holes.length, "holes");
    }

    private setupInput(): void {
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (MODAL_OPEN) return;
            this.mousePosition.set(pointer.x, pointer.y);

            if (this.isMobile && this.isDraggingShot && !this.powerMeter.isDragging) {
                const whiteBall = this.balls[this.balls.length - 1]!;
                const { x, y } = whiteBall.phaserSprite!;

                this.lockedAimAngle = Math.atan2(pointer.y - y, pointer.x - x);
            }
        });

        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (MODAL_OPEN) return;

            const isTouchingPowerMeter = this.isTouchingPowerMeter(pointer);

            // Handle by the power meter
            if (this.isMobile && isTouchingPowerMeter) return;

            const whiteBall = this.balls[this.balls.length - 1]!;
            const { x, y } = whiteBall.phaserSprite!;

            // Lock aim direction ON CLICK
            this.lockedAimAngle = Math.atan2(pointer.y - y, pointer.x - x);

            if (!this.isMobile) this.dragStartPosition.set(pointer.x, pointer.y);

            this.isDraggingShot = true;
        });

        this.input.on("pointerup", () => {
            if (MODAL_OPEN) return;

            if (this.powerMeter.power <= 0) {
                this.isDraggingShot = false;
                return;
            }

            if (this.isMobile && this.powerMeter.isDragging) {
                this.sound.play(POOL_ASSETS.SOUND_EFFECTS.CUE_HIT_WHITE_BALL);
                this.keyPositions = this.service.hitBalls(this.powerMeter.power, this.cue.rotation);
                this.setPower(0);
            } else if (!this.isMobile && this.isDraggingShot) {
                this.sound.play(POOL_ASSETS.SOUND_EFFECTS.CUE_HIT_WHITE_BALL);
                this.keyPositions = this.service.hitBalls(this.powerMeter.power, this.cue.rotation);
                this.setPower(0);
            }

            this.isDraggingShot = false;
        });
    }

    private updateCue(): void {
        if (!this.cue.phaserSprite) return;

        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = whiteBall.phaserSprite!;

        let angle: number;

        if (!this.input.enabled) {
            // Keep cue in last recorded position
            this.cue.phaserSprite.setPosition(this.lastCuePosition.x, this.lastCuePosition.y);
            this.cue.phaserSprite.setRotation(this.lastCuePosition.rotation);
            this.cue.rotation = this.lastCuePosition.rotation;

            this.aimLine.clear();
            return;
        }

        const updateCueBullback = (x: number, y: number, angle: number) => {
            // Pullback cue based on power
            const maxPullback = 200;
            const pullbackDistance = BALL_RADIUS + this.powerMeter.power * maxPullback;

            const offsetX = x - Math.cos(angle) * pullbackDistance;
            const offsetY = y - Math.sin(angle) * pullbackDistance;

            this.cue.phaserSprite.setPosition(offsetX, offsetY);
            this.cue.phaserSprite.setRotation(angle);
            this.cue.rotation = angle;
            this.lastCuePosition = { x: offsetX, y: offsetY, rotation: angle };
        };

        if (this.isMobile && this.powerMeter.isDragging) {
            this.cue.phaserSprite.setPosition(this.lastCuePosition.x, this.lastCuePosition.y);
            this.cue.phaserSprite.setRotation(this.lastCuePosition.rotation);
            this.cue.rotation = this.lastCuePosition.rotation;

            // Still show aim line with current angle
            this.drawAimLine(x, y, this.cue.rotation);
            updateCueBullback(x, y, this.cue.rotation);
            return;
        }

        if (this.isDraggingShot) {
            angle = this.lockedAimAngle;

            if (!this.isMobile) {
                const aimDir = new Vector2(Math.cos(this.lockedAimAngle), Math.sin(this.lockedAimAngle));

                this.dragVector.set(
                    this.mousePosition.x - this.dragStartPosition.x,
                    this.mousePosition.y - this.dragStartPosition.y
                );

                const pullDir = aimDir.clone().negate();
                const pullAmount = this.dragVector.dot(pullDir);

                // Only allow positive pull (dragging backward)
                const maxDrag = 200;
                const power = Math.max(Math.min(pullAmount, maxDrag) / maxDrag, 0);
                this.setPower(power);
            }
        } else {
            // Free aiming when not dragging
            angle = Math.atan2(this.mousePosition.y - y, this.mousePosition.x - x);
        }

        // Aim line
        this.drawAimLine(x, y, angle);
        updateCueBullback(x, y, angle);
    }

    private drawAimLine(ballX: number, ballY: number, angle: number): void {
        this.aimLine.clear();

        const aimDir = new Vector2(Math.cos(angle), Math.sin(angle));

        // TODO: change to ray casting until we hit a ball/wall (Implement after doing the collision stuff)
        const aimLineLength = 1000;
        const aimLineStartOffset = BALL_RADIUS + 2;

        const aimStartX = ballX + aimDir.x * aimLineStartOffset;
        const aimStartY = ballY + aimDir.y * aimLineStartOffset;

        this.aimLine.lineStyle(2, 0xffffff, 1.5);
        this.aimLine.beginPath();
        this.aimLine.moveTo(aimStartX, aimStartY);
        this.aimLine.lineTo(aimStartX + aimDir.x * aimLineLength, aimStartY + aimDir.y * aimLineLength);
        this.aimLine.strokePath();
    }

    private setupDebugPanel() {
        const debugPanelHeight = 180;
        const debugPanelWidth = this.cameras.main.width / 2;
        const debugPanelPosition = {
            x: this.cameras.main.width / 2 - debugPanelWidth / 2,
            y: this.cameras.main.height - debugPanelHeight,
        };

        this.debugPanel = new DebugPanel(
            this,
            {
                INPUT_STATE: () => {
                    const draggingPowerMeter = this.powerMeter.isDragging;
                    const draggingShot = this.isDraggingShot;
                    return (
                        `[${this.service.whoseTurn().toUpperCase()}] - ` +
                        ((draggingShot && !this.isMobile) || draggingPowerMeter ? "AIMING" : "IDLE")
                    );
                },

                BALL_RADIUS: () => BALL_RADIUS,
                POWER: () => this.powerMeter.power.toFixed(2),
                "CUE ANGLE": () => Phaser.Math.RadToDeg(this.cue.rotation).toFixed(1) + "°",
                "WHITE BALL": () => {
                    const b = this.balls[this.balls.length - 1]!;
                    return `(${b.phaserSprite.x.toFixed(1)}, ${b.phaserSprite.y.toFixed(1)})`;
                },
                "TABLE SIZE": () => `${this.tableWidth.toFixed(0)}x${this.tableHeight.toFixed(0)}`,
                "DEVICE SCALE": () => `${this.game.scale.canvas.width}x${this.game.scale.canvas.height}`,
            },
            { width: debugPanelWidth, height: debugPanelHeight },
            debugPanelPosition
        );
    }

    private setupButtonHover(button: Phaser.GameObjects.Text, onClick: () => void): void {
        button.on("pointerover", () => {
            button.setStyle({
                color: "#ffff00",
                backgroundColor: "#5a4530",
                stroke: "#deb887",
            });
        });

        button.on("pointerout", () => {
            button.setStyle({
                color: "#ffd700",
                backgroundColor: "#4a3520",
                stroke: "#8b4513",
            });
        });

        button.on("pointerdown", () => {
            button.setStyle({
                color: "#000000",
                backgroundColor: "#ffd700",
                stroke: "#000000",
            });
            onClick();
        });
    }
}
