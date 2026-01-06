/**
 * Main pool game scene - handles game logic, rendering, and physics
 */

import * as Phaser from "phaser";
import {
    BALL_RADIUS,
    CUSHION_CONSTANTS,
    DEBUG_GRAPHICS,
    HOLE_RADIUS,
    MODAL_OPEN,
    POOL_ASSETS,
    POOL_SCENE_KEYS,
} from "../common/pool-constants";
import { type Ball, type BallType, type Collider, type Cue, type Hole, type KeyPositions } from "../common/pool-types";
import { Events } from "../common/server-types";
import { MultiplayerService } from "../services/multiplayer-service.tsx";
import { PoolService } from "../services/pool-service";
import type { Service } from "../services/service";
import { DebugPanelModal } from "./components/debug-panel-modal";

const Vector2 = Phaser.Math.Vector2;

export class PoolGameScene extends Phaser.Scene {
    private debugPanel?: DebugPanelModal;
    private service!: Service;
    private keyPositions: KeyPositions = [];

    private isGameStarted = false;

    // Game state
    public balls: Ball[] = [];
    public holes: Hole[] = [];
    public colliders: Collider[] = [];
    private cue!: Cue;

    // Dynamic dimensions based on device scale
    public tableWidth!: number;
    public tableHeight!: number;
    public marginX!: number;
    public marginY!: number;

    private powerMeter!: {
        background: Phaser.GameObjects.Graphics;
        fill: Phaser.GameObjects.Graphics;
        handle: Phaser.GameObjects.Sprite;
        isDragging: boolean;
        power: number;
        position: { x: number; y: number };
        size: { width: number; height: number; handleHeight: number };
    };

    // Graphics
    private hand!: Phaser.GameObjects.Sprite;
    private background!: Phaser.GameObjects.Image;
    private holeBalls: Phaser.GameObjects.Sprite[] = [];
    private playedSounds: (number | undefined)[] = [];

    // Input state
    private mousePosition = new Vector2();
    private isDraggingShot = false;
    private dragStartPosition = new Vector2();
    private lockedAimAngle = 0;
    private dragVector = new Vector2();
    private aimLine!: Phaser.GameObjects.Graphics;
    private isMobile = false;

    private pocketedBallsRail!: {
        background: Phaser.GameObjects.Graphics;
        ballPositions: Array<{ x: number; y: number }>;
        ballSprites: Phaser.GameObjects.Sprite[];
        pocketedBalls: Array<{ ball: Ball; positionIndex: number; isAnimating: boolean }>;
        animationTweens: Phaser.Tweens.Tween[];
    };

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

        // Create UI
        this.createPowerMeter();
        this.createPocketedBallsRail();
        this.createHand();

        // Setup input
        this.registerEvents(new MultiplayerService(new PoolService(this)));
        this.setupInput();
        this.createCue();

        this.service.connect();
    }

    private createHand(): void {
        this.hand = this.add.sprite(this.scale.width / 2, this.scale.height / 2, POOL_ASSETS.HAND)
            .setDisplaySize(BALL_RADIUS * 10, BALL_RADIUS * 10)
            .setVisible(false);
    }

    private checkWinner(): void {
        const winner = this.service.winner();
        if (!winner) return;

        const midw = this.scale.width / 2;
        const midh = this.scale.height / 2;

        this.add.rectangle(midw, midh, this.tableWidth - 40, 140, 0x1f326e, 0.8);
        this.add.text(midw, midh - 20, `${winner} WINS!`, { fontSize: "64px" }).setOrigin(0.5);
        this.add.text(midw, midh + 40, "Click to play again!", { fontSize: "32px" }).setOrigin(0.5);

        this.input.once("pointerdown", () => window.location.reload());

        this.isGameStarted = false;
    }

    private registerEvents(service: Service): void {
        this.service = service;

        this.service.subscribe(Events.INIT, () => {
            this.service.timerStart();
            this.isGameStarted = true;
            console.log("Pool game initialized with", this.balls.length, "balls");
        });

        this.service.subscribe(Events.PULL, ({ x, y, angle }) => {
            const width = this.tableWidth;
            const height = this.tableHeight;

            const mx = this.marginX;
            const my = this.marginY;

            this.updateCueBullback(x * width + mx, y * height + my, angle);
        });

        this.service.subscribe(Events.HITS, ({ keyPositions, state }) => {
            this.keyPositions.push.apply(this.keyPositions, keyPositions);
            this.service.timerStop();
            this.service.setState(state);
            this.checkWinner();
        });

        this.service.subscribe(Events.HAND, ({ x, y, userId }) => {
            if (userId === this.service.me()?.id) return;

            const width = this.tableWidth;
            const height = this.tableHeight;

            const mx = this.marginX;
            const my = this.marginY;

            const whiteBall = this.balls[this.balls.length - 1]!;
            whiteBall.phaserSprite.setPosition(x * width + mx, y * height + my);
            whiteBall.phaserSprite.visible = true;
            whiteBall.isPocketed = false;
        });
    }

    private calculateTableDimensions(): void {
        const canvasWidth = this.scale.width;
        const canvasHeight = this.scale.height;

        const maxMargin = 200;

        this.marginX = (maxMargin * canvasWidth) / 1920;
        this.marginY = (maxMargin * canvasHeight) / 1080;

        const availableWidth = canvasWidth - 2 * this.marginX;
        const availableHeight = canvasHeight - 2 * this.marginY;

        // Maintain the original table aspect ratio
        const originalAspectRatio = 16 / 9;
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
        return { x: this.marginX + x, y: this.marginY + y };
    }

    public override update(): void {
        if (!this.isGameStarted) return;

        this.input.enabled = !this.keyPositions.length;

        this.updateCue();
        this.updateKeyPositions();
        this.checkForNewlyPocketedBalls();

        this.debugPanel?.update();
    }

    private createBalls(): void {
        const ROWS = 3;
        const r = BALL_RADIUS;
        const DIAMETER = r * 2;
        const ROW_SPACING = DIAMETER * 0.8;
        const COL_SPACING = DIAMETER * 0.8;

        const rackOrigin = { x: this.tableWidth / 4, y: this.tableHeight / 2 };
        const solids = Object.values(POOL_ASSETS.SOLID);
        const stripes = Object.values(POOL_ASSETS.STRIPES);

        // --- Create racked balls (triangle) ---
        for (let row = 0; row < ROWS; row++) {
            const ballsInRow = ROWS - row;
            const x = rackOrigin.x + row * COL_SPACING;
            const startY = rackOrigin.y - ((ballsInRow - 1) * ROW_SPACING) / 2;

            for (let i = 0; i < ballsInRow; i++) {
                const isSolid = i % 2 === 0;
                const ballType: BallType = isSolid ? "solid" : "striped";
                const texture = isSolid ? solids.shift() : stripes.shift();

                const y = startY + i * ROW_SPACING;
                this.createBall(x, y, ballType, texture || POOL_ASSETS.WHITE_BALL);
            }
        }

        const eightBall = this.balls[this.balls.length - 1]!;
        eightBall.ballType = "black";
        eightBall.phaserSprite.setTexture(POOL_ASSETS.BLACK_BALL);

        //  whiteball ball ---
        const cueX = this.tableWidth * 0.75;
        const cueY = rackOrigin.y;

        this.createBall(cueX, cueY, "white", POOL_ASSETS.WHITE_BALL);
    }

    private createCue(): void {
        this.aimLine = this.add.graphics();

        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = this.toTableCoordinates(whiteBall.phaserSprite.x, whiteBall.phaserSprite.y);
        const config = this.service.getSettings();
        const cueSprite = this.add.sprite(x, y, POOL_ASSETS.CUES.BASIC);
        cueSprite.setOrigin(1, 0.5);
        cueSprite.setFlipX(true);

        this.cue = { phaserSprite: cueSprite, rotation: 0, power: 0 };
    }

    private createColliders(): void {
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
                points: leftCushion.points.map((p) => ({ x: this.tableWidth - p.x, y: p.y })),
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
                points: topLeftCushion.points.map((p) => ({ x: p.x, y: this.tableHeight - p.y })),
                normal: new Vector2(0, -1),
            };

            const topRightCushion = {
                points: topLeftCushion.points.map((p) => ({ x: this.tableWidth - p.x, y: p.y })),
                normal: new Vector2(0, 1),
            };

            const bottomRightCushion = {
                points: topLeftCushion.points.map((p) => ({ x: this.tableWidth - p.x, y: this.tableHeight - p.y })),
                normal: new Vector2(0, -1),
            };

            return [leftCushion, rightCushion, topLeftCushion, bottomLeftCushion, topRightCushion, bottomRightCushion];
        };

        const colliderDefinitions = createMirroredColliders();

        colliderDefinitions.forEach((def) => {
            let graphics: Phaser.GameObjects.Graphics | undefined;

            if (DEBUG_GRAPHICS) {
                graphics = this.add.graphics();
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
            }

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

    private updateKeyPositions(): void {
        if (!this.keyPositions.length) return;

        const frame = this.keyPositions.shift()!;

        if (!this.keyPositions.length) this.service.timerStart();

        frame.forEach((key, i) => {
            const sprite = this.balls[i]!.phaserSprite;
            if (!sprite.visible && i < this.balls.length - 1) return;

            const pos = {
                x: key.position.x * this.tableWidth + this.marginX,
                y: key.position.y * this.tableHeight + this.marginY,
            };

            // increment rotation angle of sprite
            if (pos.x + pos.y != sprite.x + sprite.y) sprite.rotation += 0.1;
            sprite.setPosition(pos.x, pos.y);
            sprite.visible = !key.hidden;

            if (key.hidden) this.holeBalls[i]?.setAlpha(1);

            if (this.playedSounds[i] === undefined && key.collision !== undefined) {
                switch (key.collision) {
                    case "wall":
                        this.sound.play(POOL_ASSETS.SOUND_EFFECTS.BALL_HITTING_TABLE_EDGE);
                        break;
                    case "ball":
                        this.sound.play(POOL_ASSETS.SOUND_EFFECTS.CUE_HIT_WHITE_BALL);
                        break;
                    case "hole":
                        this.sound.play(POOL_ASSETS.SOUND_EFFECTS.BALL_FALLING_INTO_POCKET);
                        break;
                }
                this.sound.addListener("stop", () => (this.playedSounds[i] = undefined), { once: true });
            }
        });
    }

    private createBall(x: number, y: number, ballType: Ball["ballType"], texture: string): void {
        const r = BALL_RADIUS;
        const position = this.toTableCoordinates(x, y);

        const sprite = this.add.sprite(position.x, position.y, texture);
        sprite.setScale((r * 1.5) / sprite.width);

        this.balls.push({ ballType, phaserSprite: sprite, isPocketed: false });
    }

    private createHoles(): void {
        const ratio = this.tableWidth / 16;
        const hRatio = this.tableHeight / 14;

        const leftHolesX = ratio * 0.65;
        const topLeftHoleY = hRatio;
        const bottomLeftHoleY = this.tableHeight - topLeftHoleY;

        const rightColliderX = this.tableWidth - leftHolesX;
        const topRightHoleY = topLeftHoleY;
        const bottomRightHoleY = bottomLeftHoleY;

        const centerHolesX = this.tableWidth / 2;
        const centerHolesYOffset = 0;

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
    }

    private setupInput(): void {
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (MODAL_OPEN || !this.service.isMyTurn()) return;

            const { x: px, y: py } = pointer;
            this.mousePosition.set(px, py);

            const whiteBall = this.balls[this.balls.length - 1]!;

            if (whiteBall.isPocketed) {
                const xRatio = this.tableWidth / 16;
                const yRatio = this.tableHeight / 12;

                if (px < this.marginX + xRatio * CUSHION_CONSTANTS.SIDE_INNER_X ||
                    px > this.marginX + this.tableWidth - xRatio * CUSHION_CONSTANTS.SIDE_OUTER_X ||
                    py < this.marginY + yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y ||
                    py > this.marginY + this.tableHeight - yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y) {
                    return;
                }

                const pos = new Vector2(px, py);

                for (const ball of this.balls) {
                    const { x, y } = ball.phaserSprite;
                    const ballPos = new Vector2(x, y);

                    if (ballPos.distance(pos) <= BALL_RADIUS * 1.5) {
                        return;
                    }
                }

                const mx = this.marginX;
                const my = this.marginY;

                this.hand.visible = true;
                this.hand.setPosition(px, py);
                this.service.moveHand((px - mx) / this.tableWidth, (py - my) / this.tableHeight);
                return;
            }

            if (this.isMobile && this.isDraggingShot && !this.powerMeter.isDragging) {
                const { x, y } = whiteBall.phaserSprite!;
                this.lockedAimAngle = Math.atan2(py - y, px - x);
            }
        });

        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (MODAL_OPEN || !this.service.isMyTurn()) return;

            const wb = this.balls.length - 1;
            const whiteBall = this.balls[wb]!;
            const { x: px, y: py } = pointer;

            // Hand Stuff
            if (whiteBall.isPocketed) {
                const xRatio = this.tableWidth / 16;
                const yRatio = this.tableHeight / 12;

                if (px < this.marginX + xRatio * CUSHION_CONSTANTS.SIDE_INNER_X ||
                    px > this.marginX + this.tableWidth - xRatio * CUSHION_CONSTANTS.SIDE_OUTER_X ||
                    py < this.marginY + yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y ||
                    py > this.marginY + this.tableHeight - yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y) {
                    return;
                }

                const pos = new Vector2(px, py);

                for (const ball of this.balls) {
                    const { x, y } = ball.phaserSprite;
                    const ballPos = new Vector2(x, y);

                    if (ballPos.distance(pos) <= BALL_RADIUS * 1.5) {
                        return;
                    }
                }

                whiteBall.phaserSprite.visible = true;
                whiteBall.phaserSprite.setPosition(px, py);
                whiteBall.isPocketed = this.hand.visible = false;
                this.service.setInHole(wb, false);
                return;
            }

            const isTouchingPowerMeter = this.isTouchingPowerMeter(pointer);

            // Handle by the power meter
            if (this.isMobile && isTouchingPowerMeter) return;

            const { x, y } = whiteBall.phaserSprite!;

            // Lock aim direction ON CLICK
            this.lockedAimAngle = Math.atan2(py - y, px - x);

            if (!this.isMobile) this.dragStartPosition.set(px, py);

            this.isDraggingShot = true;
        });

        this.input.on("pointerup", () => {
            if (MODAL_OPEN || !this.service.isMyTurn()) return;

            if (this.powerMeter.power <= 0) {
                this.isDraggingShot = false;
                return;
            }

            if ((this.isMobile && this.powerMeter.isDragging) || (!this.isMobile && this.isDraggingShot)) {
                this.sound.play(POOL_ASSETS.SOUND_EFFECTS.CUE_HIT_WHITE_BALL);
                this.service.hitBalls(this.powerMeter.power, this.cue.rotation);
                this.setPower(0);
            }

            this.isDraggingShot = false;
        });
    }

    private updateCueBullback(x: number, y: number, angle: number): void {
        // Pullback cue based on power
        const maxPullback = 200;
        const pullbackDistance = BALL_RADIUS + this.powerMeter.power * maxPullback;

        const offsetX = x - Math.cos(angle) * pullbackDistance;
        const offsetY = y - Math.sin(angle) * pullbackDistance;

        this.cue.phaserSprite.setPosition(offsetX, offsetY);
        this.cue.phaserSprite.setRotation(angle);
        this.cue.rotation = angle;
    }

    private updateCue(): void {
        if (!this.cue.phaserSprite || !this.service.isMyTurn()) return;

        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = whiteBall.phaserSprite!;

        let angle: number;

        if (!this.input.enabled || whiteBall.isPocketed) {
            this.aimLine.clear();
            return;
        }

        const width = this.tableWidth;
        const height = this.tableHeight;

        const mx = this.marginX;
        const my = this.marginY;

        if (this.isMobile && this.powerMeter.isDragging) {
            // Still show aim line with current angle
            this.drawAimLine(x, y, this.cue.rotation);
            this.service.pull((x - mx) / width, (y - my) / height, this.cue.rotation);
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
        this.service.pull((x - mx) / width, (y - my) / height, angle);
    }

    private drawAimLine(ballX: number, ballY: number, angle: number): void {
        this.aimLine.clear();

        const aimDir = new Vector2(Math.cos(angle), Math.sin(angle));
        const aimStartX = ballX + aimDir.x * (BALL_RADIUS + 2);
        const aimStartY = ballY + aimDir.y * (BALL_RADIUS + 2);

        let currentPos = new Vector2(aimStartX, aimStartY);
        let rayDirection = aimDir.clone();
        const maxDistance = 2000;

        let hitDetected = false;
        let hitPosition = new Vector2(0, 0);
        let hitType: "ball" | "wall" | null = null;

        const whiteBallIndex = this.balls.findIndex((ball) => ball.ballType === "white");
        let closestBallDistance = Infinity;
        let closestBallHitPos = new Vector2(0, 0);

        for (let i = 0; i < this.balls.length; i++) {
            if (i === whiteBallIndex) continue;

            const ball = this.balls[i]!;
            const ballPos = new Vector2(ball.phaserSprite.x, ball.phaserSprite.y);

            const dx = currentPos.x - ballPos.x;
            const dy = currentPos.y - ballPos.y;

            const a = rayDirection.x * rayDirection.x + rayDirection.y * rayDirection.y;
            const b = 2 * (dx * rayDirection.x + dy * rayDirection.y);
            const c = dx * dx + dy * dy - BALL_RADIUS * BALL_RADIUS;

            const discriminant = b * b - 4 * a * c;

            if (discriminant >= 0) {
                const sqrtDisc = Math.sqrt(discriminant);
                const t1 = (-b - sqrtDisc) / (2 * a);
                const t2 = (-b + sqrtDisc) / (2 * a);

                let t = Infinity;
                if (t1 > 0 && t1 < t) t = t1;
                if (t2 > 0 && t2 < t) t = t2;

                if (t < maxDistance && t < closestBallDistance) {
                    closestBallDistance = t;
                    closestBallHitPos = new Vector2(currentPos.x + rayDirection.x * t, currentPos.y + rayDirection.y * t);
                    hitType = "ball";
                }
            }
        }

        let closestWallDistance = Infinity;
        let closestWallHitPos = new Vector2(0, 0);

        if (closestBallDistance < Infinity || closestWallDistance < Infinity) {
            hitDetected = true;
            if (closestBallDistance < closestWallDistance) {
                hitPosition = closestBallHitPos;
                hitType = "ball";
            } else {
                hitPosition = closestWallHitPos;
                hitType = "wall";
            }
        }

        this.aimLine.lineStyle(2, 0xffffff, 1.5);
        this.aimLine.beginPath();
        this.aimLine.moveTo(aimStartX, aimStartY);

        if (hitDetected) {
            this.aimLine.lineTo(hitPosition.x, hitPosition.y);

            this.aimLine.lineStyle(3, hitType === "ball" ? 0xff0000 : 0xffff00, 1);
            this.aimLine.strokeCircle(hitPosition.x, hitPosition.y, 5);
        } else {
            this.aimLine.lineTo(aimStartX + aimDir.x * maxDistance, aimStartY + aimDir.y * maxDistance);
        }

        this.aimLine.strokePath();
    }

    private setupDebugPanel(): void {
        this.debugPanel = new DebugPanelModal(this, 0, 0, {
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
            "HOLE RADIUS": () => `${HOLE_RADIUS.toFixed(0)}`,
        });
    }

    // POCKETED BALLS RAIL

    private createPocketedBallsRail(): void {
        const railWidth = 40;
        const railHeight = this.tableHeight * 0.8;
        const railX = this.marginX - railWidth - 20;
        const railY = this.marginY + (this.tableHeight - railHeight) / 2;
        const ballRadius = BALL_RADIUS * 0.75;

        const background = this.add
            .graphics()
            .fillStyle(0x1a1a1a, 0.9)
            .fillRoundedRect(railX, railY, railWidth, railHeight, 10)

            .fillStyle(0x1a1a1a, 0.9)
            .fillRoundedRect(railX + 3, railY + 3, railWidth - 6, railHeight - 6, 8)

            .lineStyle(3, 0x4a3520, 1)
            .strokeRoundedRect(railX, railY, railWidth, railHeight, 10);

        const columns = 1;
        const rows = 14;
        const verticalSpacing = ballRadius * 1.5;
        const startX = railX + railWidth / 2;
        const startY = railY + ballRadius + 10;

        const ballPositions: Array<{ x: number; y: number }> = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                ballPositions.push({ x: startX, y: startY + row * verticalSpacing });
            }
        }

        const ballSprites: Phaser.GameObjects.Sprite[] = ballPositions.map((pos) => (
            this.add
                .sprite(pos.x, pos.y, POOL_ASSETS.WHITE_BALL)
                .setScale((ballRadius * 2) / 256)
                .setAlpha(0)
                .setVisible(false)
        ));

        this.pocketedBallsRail = {
            background,
            ballPositions,
            ballSprites,
            pocketedBalls: [],
            animationTweens: [],
        };
    }

    private checkForNewlyPocketedBalls(): void {
        let i;

        for (i = 0; i < this.balls.length - 1; ++i) {
            const ball = this.balls[i]!;

            if (!ball.phaserSprite.visible && !ball.isPocketed) {
                const alreadyPocketed = this.pocketedBallsRail.pocketedBalls.some((pb) => pb.ball === ball);

                if (!alreadyPocketed) {
                    ball.isPocketed = true;
                    this.animateBallToRail(ball);
                }
            }
        }

        const whiteBall = this.balls[i]!;
        whiteBall.isPocketed = !whiteBall.phaserSprite.visible;
    }

    private animateBallToRail(ball: Ball): void {
        const { ballPositions, pocketedBalls } = this.pocketedBallsRail;
        const positionIndex = ballPositions.length - 1 - pocketedBalls.length;

        if (positionIndex < 0) {
            console.warn("Rail is full!");
            return;
        }

        const targetPosition = ballPositions[positionIndex];
        if (!targetPosition) return;

        const dropStartPosition = { x: targetPosition.x, y: this.marginY - 50 };
        const sprite = ball.phaserSprite;
        const ballClone = this.add
            .sprite(sprite.x, sprite.y, sprite.texture.key)
            .setScale(ball.phaserSprite.scale)
            .setAlpha(0.8);

        pocketedBalls.push({ ball, positionIndex, isAnimating: true });

        const moveToTopTween = this.tweens.add({
            targets: ballClone,
            x: dropStartPosition.x,
            y: dropStartPosition.y,
            duration: 400,
            ease: "Power2",
            onComplete: () => {
                const dropTween = this.tweens.add({
                    targets: ballClone,
                    y: targetPosition.y,
                    duration: 300,
                    ease: "Bounce.easeOut",
                    onComplete: () => {
                        ballClone.destroy();

                        const pocketedBall = pocketedBalls.find((pb) => pb.ball === ball);
                        if (pocketedBall) pocketedBall.isAnimating = false;

                        this.updateRailDisplay();

                        if (positionIndex > 0) {
                            const landedOnIndex = positionIndex - 1;
                            const landedOnSprite = this.pocketedBallsRail.ballSprites[landedOnIndex];
                            if (landedOnSprite && landedOnSprite.visible) {
                                this.tweens.add({
                                    targets: landedOnSprite,
                                    scale: landedOnSprite.scale,
                                    duration: 100,
                                    yoyo: true,
                                    ease: "Sine.easeInOut",
                                });
                            }
                        }
                    },
                });

                this.pocketedBallsRail.animationTweens.push(dropTween);
            },
        });

        this.pocketedBallsRail.animationTweens.push(moveToTopTween);
    }

    private updateRailDisplay(): void {
        this.pocketedBallsRail.ballSprites.forEach((sprite) => {
            sprite.setVisible(false).setAlpha(0);
        });

        this.pocketedBallsRail.pocketedBalls.forEach((pocketedBall) => {
            if (!pocketedBall.isAnimating) {
                this.pocketedBallsRail.ballSprites[pocketedBall.positionIndex]
                    ?.setTexture(pocketedBall.ball.phaserSprite.texture.key)
                    .setAlpha(1)
                    .setVisible(true)
                    .setScale((BALL_RADIUS * 2) / 256)
                    .setDepth(100 + pocketedBall.positionIndex);
            }
        });
    }

    // POWER METER

    private createPowerMeter(): void {
        const powerMeterWidth = 60;
        const powerMeterHeight = 550;
        const handleHeight = 50;
        const powerMeterX = this.marginX + this.tableWidth + 50;
        const powerMeterY = this.marginY + this.tableHeight / 2 - powerMeterHeight / 2;
        const minY = powerMeterY;
        const maxY = powerMeterY + powerMeterHeight - handleHeight;

        // Background of power meter
        const background = this.add
            .graphics()
            .fillStyle(0x1a1a1a, 0.9)
            .fillRoundedRect(powerMeterX, powerMeterY, powerMeterWidth, powerMeterHeight, 10)
            .lineStyle(3, 0x4a3520, 1)
            .strokeRoundedRect(powerMeterX, powerMeterY, powerMeterWidth, powerMeterHeight, 10);

        const fill = this.add.graphics();
        const handle = this.add
            .sprite(powerMeterX + powerMeterWidth / 2, minY + handleHeight / 2, POOL_ASSETS.DRAG_ICON)
            .setScale(0.05)
            .setRotation(Math.PI / 2)
            .setInteractive({ draggable: true, useHandCursor: true });

        // Add power label
        this.add
            .text(powerMeterX + powerMeterWidth / 2, powerMeterY - 30, "POWER", {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#d4af37",
                fontStyle: "bold",
            })
            .setOrigin(0.5, 0.5);

        this.powerMeter = {
            background,
            fill,
            handle,
            isDragging: false,
            power: 0,
            position: {
                x: powerMeterX,
                y: powerMeterY,
            },
            size: {
                width: powerMeterWidth,
                height: powerMeterHeight,
                handleHeight,
            },
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
            this.service.hitBalls(this.powerMeter.power, this.cue.rotation);
            this.setPower(0);
        });

        handle.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (MODAL_OPEN) return;

            const usableHeight = maxY - minY - handleHeight;
            const clampedY = Phaser.Math.Clamp(dragY, minY + handleHeight / 2, maxY - handleHeight / 2);
            const power = (clampedY - (minY + handleHeight / 2)) / usableHeight;
            this.setPower(power);

            handle.x = powerMeterX + powerMeterWidth / 2; // Keep handle centered horizontally
        });

        this.updatePowerMeterFromPower();
    }

    private updatePowerMeterFromPower(): void {
        const { power, fill, handle } = this.powerMeter;
        const { x, y } = this.powerMeter.position;
        const { width, height, handleHeight } = this.powerMeter.size;

        const minY = y;
        const maxY = y + height - handleHeight;

        const usableHeight = maxY - minY - handleHeight;
        const handleY = minY + handleHeight / 2 + usableHeight * power;
        handle.y = handleY;

        fill.clear();

        if (power <= 0) return;

        let color = 0x00ff00; // Green
        if (power > 0.66) color = 0xff0000; // Red
        else if (power > 0.33) color = 0xffff00; // Yellow

        const fillHeight = usableHeight * power;
        fill.fillRoundedRect(x + 5, minY + 5, width - 10, fillHeight, 5);
        fill.fillStyle(color, 0.7);
    }

    private isTouchingPowerMeter({ x: px, y: py }: Phaser.Input.Pointer): boolean {
        const { x, y, width, height } = this.powerMeter.handle.getBounds();
        return px >= x && px <= x + width && py >= y && py <= y + height;
    }

    private setPower(power: number): void {
        this.powerMeter.power = power;
        this.updatePowerMeterFromPower();
    }
}
