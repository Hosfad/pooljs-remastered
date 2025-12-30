/**
 * Main pool game scene - handles game logic, rendering, and physics
 */

import * as Phaser from "phaser";
import {
    BALL_RADIUS,
    DEBUG_GRAPHICS,
    HOLE_RADIUS,
    POOL_ASSETS,
    POOL_SCENE_KEYS,
    POOL_TABLE_HEIGHT,
    POOL_TABLE_WIDTH,
    POWER_METER,
} from "../common/pool-constants";
import {
    type Ball,
    type Collider,
    type Cue,
    type Hole,
    type KeyPositions,
} from "../common/pool-types";
import { PoolService } from "../services/pool-service";

const Vector2 = Phaser.Math.Vector2;

export class PoolGameScene extends Phaser.Scene {
    private service = new PoolService();
    private keyPositions: KeyPositions = [];

    // Game state
    private balls: Ball[] = [];
    private holes: Hole[] = [];
    private cue!: Cue;
    private colliders: Collider[] = [];

    private powerMeter!: {
        background: Phaser.GameObjects.Graphics;
        fill: Phaser.GameObjects.Graphics;
        handle: Phaser.GameObjects.Sprite;
        isDragging: boolean;
        power: number;
    };

    // Graphics
    private background!: Phaser.GameObjects.Image;
    private updateDebug!: () => void;
    private readonly MAX_DEBUG_LOGS = 10;

    // Input state
    private mousePosition = new Vector2();
    private isDraggingShot = false;
    private dragStartPosition = new Vector2();
    private lockedAimAngle = 0;
    private dragVector = new Vector2();
    private aimLine!: Phaser.GameObjects.Graphics;

    private lastCuePosition = { x: 0, y: 0, rotation: 0 };

    constructor() {
        super({ key: POOL_SCENE_KEYS.POOL_GAME });
    }

    public ballsMoving(): boolean {
        return this.keyPositions.length > 0;
    }

    public create(): void {
        if (DEBUG_GRAPHICS) this.setupDebugPanel();

        this.background = this.add.image(
            POOL_TABLE_WIDTH / 2,
            POOL_TABLE_HEIGHT / 2,
            POOL_ASSETS.BACKGROUND
        );
        this.background.setDisplaySize(POOL_TABLE_WIDTH, POOL_TABLE_HEIGHT);

        // Initialize game objects
        this.createHoles();
        this.createColliders();
        this.createBalls();
        this.createCue();
        this.createPowerMeter();

        // Setup input
        this.setupInput();

        console.log("Pool game initialized with", this.balls.length, "balls");
    }

    private createBalls() {
        const ROWS = 5;
        const r = BALL_RADIUS;
        const DIAMETER = r * 2;
        const ROW_SPACING = DIAMETER * 0.8;
        const COL_SPACING = DIAMETER * 0.8;

        const rackOrigin = { x: POOL_TABLE_WIDTH / 4, y: POOL_TABLE_HEIGHT / 2 };

        // --- Create racked balls (triangle) ---
        for (let row = 0; row < ROWS; row++) {
            const ballsInRow = ROWS - row;
            const x = rackOrigin.x + row * COL_SPACING;
            const startY = rackOrigin.y - ((ballsInRow - 1) * ROW_SPACING) / 2;

            for (let i = 0; i < ballsInRow; i++) {
                const isSolid = i % 2 === 0;
                const ballType = isSolid ? "solid" : "striped";
                const texture = isSolid ? POOL_ASSETS.SOLID_BALL : POOL_ASSETS.STRIPED_BALL;

                const y = startY + i * ROW_SPACING;
                this.createBall(x, y, ballType, texture);
            }
        }

        const eightBall = this.balls[this.balls.length - 1]!;

        eightBall.ballType = "black";
        eightBall.phaserSprite.setTexture(POOL_ASSETS.BLACK_BALL);

        //  whiteball ball ---
        const cueX = POOL_TABLE_WIDTH * 0.75;
        const cueY = rackOrigin.y;

        this.createBall(cueX, cueY, "white", POOL_ASSETS.WHITE_BALL);

        console.log("Created", this.balls.length, "balls");
    }

    private createCue(): void {
        this.aimLine = this.add.graphics();

        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = whiteBall.phaserSprite;
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

        const xRatio = POOL_TABLE_WIDTH / 16;
        const yRatio = POOL_TABLE_HEIGHT / 12;

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
                        y: POOL_TABLE_HEIGHT - yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y,
                    },
                    {
                        x: xRatio * CUSHION_CONSTANTS.SIDE_INNER_X,
                        y: POOL_TABLE_HEIGHT - yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y,
                    },
                ],
                normal: new Vector2(1, 0),
            };

            const rightCushion = {
                points: leftCushion.points.map((p) => ({
                    x: POOL_TABLE_WIDTH - p.x,
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
                        x: POOL_TABLE_WIDTH / CUSHION_CONSTANTS.RAIL_POCKET_OUTER,
                        y: yRatio * (CUSHION_CONSTANTS.RAIL_OUTER_Y + CUSHION_CONSTANTS.RAIL_THICKNESS_Y),
                    },
                    {
                        x: POOL_TABLE_WIDTH / CUSHION_CONSTANTS.RAIL_POCKET_INNER,
                        y: yRatio * CUSHION_CONSTANTS.RAIL_OUTER_Y,
                    },
                ],
                normal: new Vector2(0, 1),
            };

            const bottomLeftCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: p.x,
                    y: POOL_TABLE_HEIGHT - p.y,
                })),
                normal: new Vector2(0, -1),
            };

            const topRightCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: POOL_TABLE_WIDTH - p.x,
                    y: p.y,
                })),
                normal: new Vector2(0, 1),
            };

            const bottomRightCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: POOL_TABLE_WIDTH - p.x,
                    y: POOL_TABLE_HEIGHT - p.y,
                })),
                normal: new Vector2(0, -1),
            };

            return [
                leftCushion,
                rightCushion,
                topLeftCushion,
                bottomLeftCushion,
                topRightCushion,
                bottomRightCushion,
            ];
        };

        const colliderDefinitions = createMirroredColliders();

        colliderDefinitions.forEach((def) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xff0000, 0.5);
            graphics.beginPath();
            graphics.moveTo(def.points[0]!.x, def.points[0]!.y);

            for (let i = 1; i < def.points.length; i++) {
                graphics.lineTo(def.points[i]!.x, def.points[i]!.y);
            }

            graphics.closePath();
            graphics.fillPath();

            const collider: Collider = {
                sprite: {
                    position: new Vector2(def.points[0]!.x, def.points[0]!.y),
                    size: { points: def.points.map((p) => new Vector2(p.x, p.y)) },
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
        const { X, Y, WIDTH, HEIGHT, HANDLE_HEIGHT, MIN_Y } = POWER_METER;

        // Background of power meter
        const background = this.add.graphics();
        background.fillStyle(0x1a1a1a, 0.9);
        background.fillRoundedRect(X - WIDTH / 2, Y, WIDTH, HEIGHT, 10);
        background.lineStyle(3, 0x4a3520, 1);
        background.strokeRoundedRect(X - WIDTH / 2, Y, WIDTH, HEIGHT, 10);

        const fill = this.add.graphics();
        const handle = this.add.sprite(X, MIN_Y + HANDLE_HEIGHT / 2, POOL_ASSETS.DRAG_ICON);
        handle.setScale(0.05);
        handle.setRotation(Math.PI / 2);
        handle.setInteractive({ draggable: true, useHandCursor: true });

        // Add power label
        this.add.text(X - WIDTH / 2, Y - 30, "POWER", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#d4af37",
            fontStyle: "bold",
        });

        this.powerMeter = { background, fill, handle, isDragging: false, power: 0 };

        // Setup drag events
        handle.on("dragstart", () => { this.powerMeter.isDragging = true; });

        handle.on("dragend", () => {
            this.powerMeter.isDragging = false;
            this.keyPositions = this.service.hitBalls(
                this.balls,
                this.powerMeter.power,
                this.cue.rotation
            );
            this.setPower(0);
        });

        handle.on(
            "drag",
            (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
                const { MIN_Y, MAX_Y, HANDLE_HEIGHT } = POWER_METER;

                const usableHeight = MAX_Y - MIN_Y - HANDLE_HEIGHT;

                const clampedY = Phaser.Math.Clamp(
                    dragY,
                    MIN_Y + HANDLE_HEIGHT / 2,
                    MAX_Y - HANDLE_HEIGHT / 2
                );

                const power = (clampedY - (MIN_Y + HANDLE_HEIGHT / 2)) / usableHeight;
                this.setPower(power);
            }
        );
        this.updatePowerMeterFromPower();
    }

    private updatePowerMeterFromPower(): void {
        const { X, WIDTH, HEIGHT, MIN_Y, MAX_Y, HANDLE_HEIGHT } = POWER_METER;

        const { power, fill, handle } = this.powerMeter;

        const usableHeight = MAX_Y - MIN_Y - HANDLE_HEIGHT;

        const handleY = MIN_Y + HANDLE_HEIGHT / 2 + usableHeight * power;

        handle.y = handleY;

        fill.clear();

        if (power <= 0) return;

        let color = 0x00ff00;
        if (power > 0.66) color = 0xff0000;
        else if (power > 0.33) color = 0xffff00;

        const fillHeight = usableHeight * power;

        fill.fillStyle(color, 0.7);
        fill.fillRoundedRect(X - WIDTH / 2 + 5, MIN_Y + 5, WIDTH - 10, fillHeight, 5);
    }

    private setPower(power: number): void {
        this.powerMeter.power = power;
        this.updatePowerMeterFromPower();
    }

    public override update(): void {
        this.updateCue();
        this.updateKeyPositions();
        this.updateDebug?.();
    }

    private updateKeyPositions(): void {
        if (!this.keyPositions.length) return;

        const frame = this.keyPositions.shift()!;
        frame.forEach((pos, i) => {
            this.balls[i]!.phaserSprite.setPosition(pos.x, pos.y);
        });
    }

    private createBall(
        x: number,
        y: number,
        ballType: Ball["ballType"],
        texture: string
    ) {
        const r = BALL_RADIUS;

        const sprite = this.add.sprite(x, y, texture);
        sprite.setScale((r * 2) / sprite.width);

        const ball: Ball = { ballType, phaserSprite: sprite };

        this.balls.push(ball);
    }

    private createHoles(): void {
        const ratio = POOL_TABLE_WIDTH / 16;
        const hRatio = POOL_TABLE_HEIGHT / 12;

        const leftHolesX = ratio * 0.8;
        const topLeftHoleY = hRatio;
        const bottomLeftHoleY = POOL_TABLE_HEIGHT - topLeftHoleY;

        const rightColliderX = POOL_TABLE_WIDTH - leftHolesX;
        const topRightHoleY = topLeftHoleY;
        const bottomRightHoleY = bottomLeftHoleY;

        const centerHolesX = POOL_TABLE_WIDTH / 2;
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
            let graphics: Phaser.GameObjects.Graphics | undefined;

            if (DEBUG_GRAPHICS) {
                graphics = this.add.graphics();
                graphics.fillStyle(0x008000, 0.8);
                graphics.fillCircle(pos.x, pos.y, HOLE_RADIUS);
            }

            const hole: Hole = {
                sprite: {
                    position: new Vector2(pos.x, pos.y),
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
            this.mousePosition.set(pointer.x, pointer.y);
        });

        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            const whiteBall = this.balls[this.balls.length - 1]!;
            const { x, y } = whiteBall.phaserSprite!;

            // Lock aim direction ON CLICK
            this.lockedAimAngle = Math.atan2(pointer.y - y, pointer.x - x);

            this.dragStartPosition.set(pointer.x, pointer.y);
            this.isDraggingShot = true;
        });

        this.input.on("pointerup", () => {
            this.isDraggingShot = false;
            this.keyPositions = this.service.hitBalls(
                this.balls,
                this.powerMeter.power,
                this.cue.rotation
            );
            this.setPower(0);
        });
    }

    private updateCue(): void {
        if (!this.cue.phaserSprite) return;

        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = whiteBall.phaserSprite!;

        let angle: number;

        if (this.ballsMoving()) {
            // Keep cue in last recorded position
            this.cue.phaserSprite.setPosition(
                this.lastCuePosition.x,
                this.lastCuePosition.y
            );
            this.cue.phaserSprite.setRotation(this.lastCuePosition.rotation);
            this.cue.rotation = this.lastCuePosition.rotation;

            this.aimLine.clear();
            return;
        }

        if (this.isDraggingShot) {
            angle = this.lockedAimAngle;

            const aimDir = new Vector2(
                Math.cos(this.lockedAimAngle),
                Math.sin(this.lockedAimAngle)
            );

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
        } else {
            // Free aiming when not dragging
            angle = Math.atan2(
                this.mousePosition.y - y,
                this.mousePosition.x - x
            );
        }

        // Pullback cue based on power
        const maxPullback = 150;
        const pullbackDistance = BALL_RADIUS + this.powerMeter.power * maxPullback;

        const offsetX = x - Math.cos(angle) * pullbackDistance;
        const offsetY = y - Math.sin(angle) * pullbackDistance;

        // Aim line
        this.aimLine.clear();

        const aimDir = new Vector2(Math.cos(angle), Math.sin(angle));

        if (!this.ballsMoving()) {
            // TODO: change to ray casting until we hit a ball/wall (Implement after doing the collision stuff)
            const aimLineLength = 1000;
            const aimLineStartOffset = BALL_RADIUS + 2;

            const aimStartX = x + aimDir.x * aimLineStartOffset;
            const aimStartY = y + aimDir.y * aimLineStartOffset;

            this.aimLine.lineStyle(2, 0xffffff, 1.5);
            this.aimLine.beginPath();
            this.aimLine.moveTo(aimStartX, aimStartY);
            this.aimLine.lineTo(
                aimStartX + aimDir.x * aimLineLength,
                aimStartY + aimDir.y * aimLineLength
            );
            this.aimLine.strokePath();
        }

        // Apply transform
        this.cue.phaserSprite.setPosition(offsetX, offsetY);
        this.cue.phaserSprite.setRotation(angle);
        this.cue.rotation = angle;
        this.lastCuePosition = { x: offsetX, y: offsetY, rotation: angle };
    }

    private setupDebugPanel() {
        const logs: string[] = [];
        const MAX_LOGS = 10;

        const originalLog = console.log;
        console.log = (...args: any[]) => {
            originalLog(...args);
            const msg = args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
            logs.push(msg);
            if (logs.length > MAX_LOGS) logs.shift();
        };
        console.log("Debug panel initialized");

        // --- UI ---
        const BOX_HEIGHT = 180;
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.85);
        bg.fillRect(0, POOL_TABLE_HEIGHT, POOL_TABLE_WIDTH, BOX_HEIGHT);
        bg.lineStyle(2, 0x00ff00, 0.6);
        bg.strokeRect(0, POOL_TABLE_HEIGHT, POOL_TABLE_WIDTH, BOX_HEIGHT);

        const text = this.add.text(10, POOL_TABLE_HEIGHT + 10, "", {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#00ff00",
            wordWrap: { width: POOL_TABLE_WIDTH - 20 },
        });

        this.updateDebug = () => {
            const whiteBall = this.balls[this.balls.length - 1]!;
            const angleDeg = Phaser.Math.RadToDeg(this.cue.rotation).toFixed(1);

            const configLines = [
                "=== CONFIG ===",
                `BALL_RADIUS: ${BALL_RADIUS}`,
                `POWER: ${this.powerMeter.power.toFixed(2)}`,
                `CUE ANGLE: ${angleDeg}°`,
                `WHITE BALL: (${whiteBall.phaserSprite.x.toFixed(1)}, ${whiteBall.phaserSprite.y.toFixed(1)})`,

                `MOVING THEM BALLZ: ${this.ballsMoving()}`,
            ];

            const logLines = ["=== LOGS ===", ...logs];

            const columnWidth = 40; // adjust to taste
            const maxLines = Math.max(configLines.length, logLines.length);

            const lines: string[] = [];

            for (let i = 0; i < maxLines; i++) {
                const left = (configLines[i] ?? "").padEnd(columnWidth, " ");
                const right = logLines[i] ?? "";
                lines.push(left + right);
            }

            text.setText(lines.join("\n"));
        };
    }
}
