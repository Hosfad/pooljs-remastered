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
} from "../common/pool-types";

export class PoolGameScene extends Phaser.Scene {
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

    // Input state
    private mousePosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private isDraggingShot = false;
    private dragStartPosition = new Phaser.Math.Vector2();
    private lockedAimAngle = 0;
    private dragVector = new Phaser.Math.Vector2();

    constructor() {
        super({ key: POOL_SCENE_KEYS.POOL_GAME });
    }

    public create(): void {
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

        const rackOrigin = {
            x: POOL_TABLE_WIDTH / 4,
            y: POOL_TABLE_HEIGHT / 2,
        };

        // --- Create racked balls (triangle) ---
        for (let row = 0; row < ROWS; row++) {
            const ballsInRow = ROWS - row;
            const x = rackOrigin.x + row * COL_SPACING;
            const startY = rackOrigin.y - ((ballsInRow - 1) * ROW_SPACING) / 2;

            for (let i = 0; i < ballsInRow; i++) {
                const isSolid = i % 2 === 0;
                const ballType = isSolid ? "solid" : "striped";
                const color = isSolid ? "yellow" : "red";
                const texture = isSolid
                    ? POOL_ASSETS.SOLID_BALL
                    : POOL_ASSETS.STRIPED_BALL;

                const y = startY + i * ROW_SPACING;
                this.createBall(x, y, ballType, color, texture);
            }
        }

        const eightBall = this.balls[this.balls.length - 1]!;

        eightBall.ballType = "black";
        eightBall.sprite.color = "black";
        eightBall.phaserSprite?.setTexture(POOL_ASSETS.BLACK_BALL);

        //  whiteball ball ---
        const cueX = POOL_TABLE_WIDTH * 0.75;
        const cueY = rackOrigin.y;

        this.createBall(cueX, cueY, "white", "white", POOL_ASSETS.WHITE_BALL);

        console.log("Created", this.balls.length, "balls");
    }

    private createBall(
        x: number,
        y: number,
        ballType: Ball["ballType"],
        color: string,
        texture: string
    ) {
        const r = BALL_RADIUS;

        const sprite = this.add.sprite(x, y, texture);
        sprite.setScale((r * 2) / sprite.width);

        const ball: Ball = {
            sprite: {
                position: new Phaser.Math.Vector2(x, y),
                color,
                size: { r },
                visible: true,
            },
            rigidbody: {
                velocity: new Phaser.Math.Vector2(0, 0),
            },
            ballType,
            phaserSprite: sprite,
        };

        this.balls.push(ball);
    }

    private createCue(): void {
        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = whiteBall.sprite.position;

        const cueSprite = this.add.sprite(x, y, POOL_ASSETS.CUE_STICK);
        cueSprite.setOrigin(1, 0.5);

        this.cue = {
            sprite: {
                position: new Phaser.Math.Vector2(x, y),
                color: "brown",
                size: { w: 400, h: 15 },
                visible: true,
            },
            phaserSprite: cueSprite,
            rotation: 0,
            power: 0,
        };
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
                    position: new Phaser.Math.Vector2(pos.x, pos.y),
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
                        x:
                            xRatio *
                            (CUSHION_CONSTANTS.SIDE_OUTER_X -
                                CUSHION_CONSTANTS.SIDE_THICKNESS_X),
                        y: yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y,
                    },
                    {
                        x:
                            xRatio *
                            (CUSHION_CONSTANTS.SIDE_OUTER_X -
                                CUSHION_CONSTANTS.SIDE_THICKNESS_X),
                        y:
                            POOL_TABLE_HEIGHT -
                            yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y,
                    },
                    {
                        x: xRatio * CUSHION_CONSTANTS.SIDE_INNER_X,
                        y:
                            POOL_TABLE_HEIGHT -
                            yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y,
                    },
                ],
                normal: new Phaser.Math.Vector2(1, 0),
            };

            const rightCushion = {
                points: leftCushion.points.map((p) => ({
                    x: POOL_TABLE_WIDTH - p.x,
                    y: p.y,
                })),
                normal: new Phaser.Math.Vector2(-1, 0),
            };

            const topLeftCushion = {
                points: [
                    {
                        x: xRatio * CUSHION_CONSTANTS.RAIL_SIDE_X,
                        y: yRatio * CUSHION_CONSTANTS.RAIL_OUTER_Y,
                    },
                    {
                        x: xRatio * CUSHION_CONSTANTS.RAIL_CORNER_X,
                        y:
                            yRatio *
                            (CUSHION_CONSTANTS.RAIL_OUTER_Y +
                                CUSHION_CONSTANTS.RAIL_THICKNESS_Y),
                    },
                    {
                        x:
                            POOL_TABLE_WIDTH /
                            CUSHION_CONSTANTS.RAIL_POCKET_OUTER,
                        y:
                            yRatio *
                            (CUSHION_CONSTANTS.RAIL_OUTER_Y +
                                CUSHION_CONSTANTS.RAIL_THICKNESS_Y),
                    },
                    {
                        x:
                            POOL_TABLE_WIDTH /
                            CUSHION_CONSTANTS.RAIL_POCKET_INNER,
                        y: yRatio * CUSHION_CONSTANTS.RAIL_OUTER_Y,
                    },
                ],
                normal: new Phaser.Math.Vector2(0, 1),
            };

            const bottomLeftCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: p.x,
                    y: POOL_TABLE_HEIGHT - p.y,
                })),
                normal: new Phaser.Math.Vector2(0, -1),
            };

            const topRightCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: POOL_TABLE_WIDTH - p.x,
                    y: p.y,
                })),
                normal: new Phaser.Math.Vector2(0, 1),
            };

            const bottomRightCushion = {
                points: topLeftCushion.points.map((p) => ({
                    x: POOL_TABLE_WIDTH - p.x,
                    y: POOL_TABLE_HEIGHT - p.y,
                })),
                normal: new Phaser.Math.Vector2(0, -1),
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
                    position: new Phaser.Math.Vector2(
                        def.points[0]!.x,
                        def.points[0]!.y
                    ),
                    size: {
                        points: def.points.map(
                            (p) => new Phaser.Math.Vector2(p.x, p.y)
                        ),
                    },
                    color: "brown",
                    visible: true,
                },
                rigidbody: {
                    velocity: new Phaser.Math.Vector2(0, 0),
                    normal: def.normal,
                },
                phaserGraphics: graphics,
            };

            this.colliders.push(collider);
        });

        console.log("Created", this.colliders.length, "colliders");
    }
    private setupInput(): void {
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            this.mousePosition.set(pointer.x, pointer.y);
        });

        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            const whiteBall = this.balls[this.balls.length - 1]!;
            const { x, y } = whiteBall.sprite.position;

            // Lock aim direction ON CLICK
            this.lockedAimAngle = Math.atan2(pointer.y - y, pointer.x - x);

            this.dragStartPosition.set(pointer.x, pointer.y);
            this.isDraggingShot = true;
        });

        this.input.on("pointerup", () => {
            this.isDraggingShot = false;

            // Optional: reset power after shot
            this.powerMeter.power = 0;
        });
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
        const handle = this.add.sprite(
            X,
            MIN_Y + HANDLE_HEIGHT / 2,
            POOL_ASSETS.DRAG_ICON
        );
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

        this.powerMeter = {
            background,
            fill,
            handle,
            isDragging: false,
            power: 0,
        };

        // Setup drag events
        handle.on("dragstart", () => {
            this.powerMeter.isDragging = true;
        });

        handle.on("dragend", () => {
            this.powerMeter.isDragging = false;
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

                const power =
                    (clampedY - (MIN_Y + HANDLE_HEIGHT / 2)) / usableHeight;

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
        fill.fillRoundedRect(
            X - WIDTH / 2 + 5,
            MIN_Y + 5,
            WIDTH - 10,
            fillHeight,
            5
        );
    }

    private setPower(power: number): void {
        const clamped = Phaser.Math.Clamp(power, 0, 1);
        this.powerMeter.power = clamped;

        this.updatePowerMeterFromPower();
    }

    public override update(): void {
        this.updateCue();
    }

    private updateCue(): void {
        if (!this.cue.phaserSprite) return;

        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = whiteBall.sprite.position;

        let angle: number;

        if (this.isDraggingShot) {
            angle = this.lockedAimAngle;

            const aimDir = new Phaser.Math.Vector2(
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
            const power = Math.max(pullAmount, 0) / maxDrag;
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
        const pullbackDistance = this.powerMeter.power * maxPullback;

        const offsetX = x - Math.cos(angle) * pullbackDistance;
        const offsetY = y - Math.sin(angle) * pullbackDistance;

        // Apply transform
        this.cue.sprite.position.set(offsetX, offsetY);
        this.cue.phaserSprite.setPosition(offsetX, offsetY);
        this.cue.phaserSprite.setRotation(angle);
        this.cue.rotation = angle;
    }
}
