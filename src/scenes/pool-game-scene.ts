/**
 * Main pool game scene - handles game logic, rendering, and physics
 */

import * as Phaser from "phaser";
import {
    BALL_FRICTION,
    BALL_MASS_KG,
    BALL_RADIUS,
    BALL_RESTITUTION,
    CLOTH_ROLLING_RESISTANCE,
    CUSHION_CONSTANTS,
    DEBUG_GRAPHICS,
    HOLE_RADIUS,
    MODAL_OPEN,
    POOL_ASSETS,
    POOL_SCENE_KEYS,
    RAIL_RESTITUTION,
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
    private aimLineShadow!: Phaser.GameObjects.Graphics;
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
        this.hand = this.add
            .sprite(this.scale.width / 2, this.scale.height / 2, POOL_ASSETS.HAND)
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
    }

    private registerEvents(service: Service): void {
        this.service = service;

        this.service.subscribe(Events.INIT, () => {
            this.service.timerStart();
            this.isGameStarted = true;
            console.log("Pool game initialized with", this.balls.length, "balls");
        });

        this.service.subscribe(Events.PULL, ({ x, y, angle, userId }) => {
            if (userId === this.service.me()?.id) return;

            const width = this.tableWidth;
            const height = this.tableHeight;

            const mx = this.marginX;
            const my = this.marginY;

            this.updateCueBullback(x * width + mx, y * height + my, angle);
        });

        this.service.subscribe(Events.HITS, ({ keyPositions, state, userId }) => {
            if (userId === this.service.me()?.id) return;

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
        const ROWS = 5;
        const r = BALL_RADIUS;
        const DIAMETER = r * 2;
        const ROW_SPACING = DIAMETER * 0.8;
        const COL_SPACING = DIAMETER * 0.8;

        const rackOrigin = new Vector2(this.tableWidth / 4, this.tableHeight / 2);
        const solids = Object.values(POOL_ASSETS.SOLID);
        const stripes = Object.values(POOL_ASSETS.STRIPES);

        // --- Create racked balls (triangle) ---
        let count = 0;

        for (let row = 0; row < ROWS; row++) {
            const ballsInRow = ROWS - row;
            const x = rackOrigin.x + row * COL_SPACING;
            const startY = rackOrigin.y - ((ballsInRow - 1) * ROW_SPACING) / 2;

            for (let i = 0; i < ballsInRow; i++) {
                const isSolid = ++count % 2 === 0;
                const ballType: BallType = isSolid ? "solid" : "striped";
                const texture = isSolid ? solids.shift() : stripes.shift();

                const y = startY + i * ROW_SPACING;
                this.createBall(x, y, ballType, texture || POOL_ASSETS.WHITE_BALL);
            }
        }

        // Blackball
        const blackBall = this.balls[this.balls.length - 1]!;
        blackBall.ballType = "black";
        blackBall.phaserSprite.setTexture(POOL_ASSETS.BLACK_BALL);

        let closestBall = blackBall;
        let closestDistance = Infinity;

        const distToOrigin = blackBall.phaserSprite.x - rackOrigin.x;
        const origin = new Vector2(rackOrigin.x + distToOrigin * 0.9, blackBall.phaserSprite.y);

        for (const ball of this.balls) {
            if (ball.ballType === "black") continue;

            const { x, y } = ball.phaserSprite;
            const ballPos = new Vector2(x, y);
            const dist = ballPos.distance(origin);

            if (dist < closestDistance) {
                closestBall = ball;
                closestDistance = dist;
            }
        }

        // Swap black with closest to origin
        const closestPosition = new Vector2(closestBall.phaserSprite.x, closestBall.phaserSprite.y);
        closestBall.phaserSprite.setPosition(blackBall.phaserSprite.x, blackBall.phaserSprite.y);
        blackBall.phaserSprite.setPosition(closestPosition.x, closestPosition.y);

        //  whiteball ball ---
        const cueX = this.tableWidth * 0.75;
        const cueY = rackOrigin.y;

        this.createBall(cueX, cueY, "white", POOL_ASSETS.WHITE_BALL);
    }

    private createCue(): void {
        this.aimLineShadow = this.add.graphics();
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
            const leftCushionPoints = [
                { x: xRatio * CUSHION_CONSTANTS.SIDE_INNER_X, y: yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y },
                { x: xRatio * CUSHION_CONSTANTS.SIDE_OUTER_X, y: yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y },
                {
                    x: xRatio * CUSHION_CONSTANTS.SIDE_OUTER_X,
                    y: this.tableHeight - yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y,
                },
                { x: xRatio * CUSHION_CONSTANTS.SIDE_INNER_X, y: this.tableHeight - yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y },
            ];

            const topLeftPoints = [
                { x: xRatio * CUSHION_CONSTANTS.RAIL_SIDE_X, y: yRatio * CUSHION_CONSTANTS.RAIL_OUTER_Y },
                {
                    x: xRatio * CUSHION_CONSTANTS.RAIL_CORNER_X,
                    y: yRatio * (CUSHION_CONSTANTS.RAIL_OUTER_Y + CUSHION_CONSTANTS.RAIL_THICKNESS_Y),
                },
                {
                    x: this.tableWidth / CUSHION_CONSTANTS.RAIL_POCKET_OUTER,
                    y: yRatio * (CUSHION_CONSTANTS.RAIL_OUTER_Y + CUSHION_CONSTANTS.RAIL_THICKNESS_Y),
                },
                { x: this.tableWidth / CUSHION_CONSTANTS.RAIL_POCKET_INNER, y: yRatio * CUSHION_CONSTANTS.RAIL_OUTER_Y },
            ];

            return [
                leftCushionPoints,
                leftCushionPoints.map((p) => ({ x: this.tableWidth - p.x, y: p.y })),
                topLeftPoints,
                topLeftPoints.map((p) => ({ x: p.x, y: this.tableHeight - p.y })),
                topLeftPoints.map((p) => ({ x: this.tableWidth - p.x, y: p.y })),
                topLeftPoints.map((p) => ({ x: this.tableWidth - p.x, y: this.tableHeight - p.y })),
            ];
        };

        createMirroredColliders().forEach((points) => {
            let graphics: Phaser.GameObjects.Graphics | undefined;

            if (DEBUG_GRAPHICS) {
                graphics = this.add.graphics();
                graphics.fillStyle(0xff0000, 0.5);
                graphics.beginPath();

                const firstPoint = this.toTableCoordinates(points[0]!.x, points[0]!.y);
                graphics.moveTo(firstPoint.x, firstPoint.y);

                for (let i = 1; i < points.length; i++) {
                    const point = this.toTableCoordinates(points[i]!.x, points[i]!.y);
                    graphics.lineTo(point.x, point.y);
                }

                graphics.closePath();
                graphics.fillPath();
            }

            // Convert to table/world coordinates
            const worldPoints = points.map((p) => this.toTableCoordinates(p.x, p.y));

            // Compute centroid
            const center = worldPoints.reduce(
                (acc, p) => {
                    acc.x += p.x;
                    acc.y += p.y;
                    return acc;
                },
                { x: 0, y: 0 }
            );

            center.x /= worldPoints.length;
            center.y /= worldPoints.length;

            // Convert to local space
            const localVerts = worldPoints.map((p) => ({
                x: p.x - center.x,
                y: p.y - center.y,
            }));

            const collider: Collider = {
                sprite: { size: { points: worldPoints.map((p) => new Vector2(p.x, p.y)) } },
                phaserGraphics: graphics,
                body: this.matter.add.fromVertices(
                    center.x,
                    center.y,
                    localVerts,
                    {
                        isSensor: true, // Until activated to use matter for collisions
                        isStatic: true,
                        restitution: RAIL_RESTITUTION,
                        friction: 0.1,
                        label: "cushion",
                    },
                    true
                ),
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
            const spd = Math.abs((pos.x + pos.y) - (sprite.x + sprite.y));
            if (spd != 0) sprite.rotation += spd / BALL_RADIUS * 2;
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
        const position = this.toTableCoordinates(x, y);
        const sprite = this.matter.add.sprite(position.x, position.y, texture);
        sprite.setScale((BALL_RADIUS * 1.5) / sprite.width);
        sprite.setBody(
            { type: "circle", radius: BALL_RADIUS },
            {
                isSensor: true, // Until activated to use matter for collisions
                restitution: BALL_RESTITUTION,
                friction: BALL_FRICTION,
                frictionAir: CLOTH_ROLLING_RESISTANCE,
                mass: BALL_MASS_KG,
                label: `${texture}-${ballType}-ball`,
            }
        );

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
                    size: { r: HOLE_RADIUS },
                },
                phaserGraphics: graphics,
                body: this.matter.add.circle(position.x, position.y, HOLE_RADIUS, {
                    isStatic: true,
                    isSensor: true,
                    label: "hole",
                }),
            };
            this.holes.push(hole);
        });
    }

    private getTableEdges(): { left: number; right: number; top: number; bottom: number } {
        const tw = this.tableWidth;
        const th = this.tableHeight;

        const mx = this.marginX;
        const my = this.marginY;

        const xRatio = tw / 16;
        const yRatio = th / 12;

        return {
            left: mx + xRatio * CUSHION_CONSTANTS.SIDE_OUTER_X + BALL_RADIUS,
            right: mx + tw - xRatio * CUSHION_CONSTANTS.SIDE_OUTER_X + BALL_RADIUS,
            top: my + yRatio * CUSHION_CONSTANTS.SIDE_TOP_Y + BALL_RADIUS * 1.5,
            bottom: my + th - yRatio * CUSHION_CONSTANTS.SIDE_BOTTOM_Y + BALL_RADIUS * 1.5,
        };
    }

    private canPlaceBall(px: number, py: number): boolean {
        const { left, right, top, bottom } = this.getTableEdges();
        if (px < left || px > right || py < top || py > bottom) return false;

        const pos = new Vector2(px, py);

        for (const hole of this.holes) {
            const {
                sprite: { position },
            } = hole;
            const holePos = new Vector2(position.x, position.y);

            if (holePos.distance(pos) <= HOLE_RADIUS * 1) {
                return false;
            }
        }

        for (const ball of this.balls) {
            const { x, y } = ball.phaserSprite;
            const ballPos = new Vector2(x, y);

            if (ballPos.distance(pos) <= BALL_RADIUS * 1.5) {
                return false;
            }
        }

        return true;
    }

    private setupInput(): void {
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (MODAL_OPEN || !this.service.isMyTurn()) return;

            const { x: px, y: py } = pointer;
            this.mousePosition.set(px, py);

            const whiteBall = this.balls[this.balls.length - 1]!;

            if (whiteBall.isPocketed && this.canPlaceBall(px, py)) {
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
            if (whiteBall.isPocketed && this.canPlaceBall(px, py)) {
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
        const whiteBall = this.balls[this.balls.length - 1]!;

        if (!this.input.enabled || whiteBall.isPocketed) {
            this.aimLineShadow.clear();
            this.aimLine.clear();
            return;
        }

        if (!this.cue.phaserSprite || !this.service.isMyTurn()) return;

        const width = this.tableWidth;
        const height = this.tableHeight;

        const mx = this.marginX;
        const my = this.marginY;

        const { x, y } = whiteBall.phaserSprite!;

        if (this.isMobile && this.powerMeter.isDragging) {
            // Still show aim line with current angle
            this.drawAimLine(x, y, this.cue.rotation);
            this.service.pull((x - mx) / width, (y - my) / height, this.cue.rotation);
            return;
        }

        let angle: number;

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

    private lineStyle(width: number, color: number, alpha: number = 1): void {
        this.aimLineShadow.lineStyle(width * 3, 0x000000, alpha);
        this.aimLine.lineStyle(width, color, alpha);
    }

    private strokePath(): void {
        this.aimLineShadow.strokePath();
        this.aimLine.strokePath();
    }

    private beginPath(): void {
        this.aimLineShadow.beginPath();
        this.aimLine.beginPath();
    }

    private moveTo(x: number, y: number): void {
        this.aimLineShadow.moveTo(x, y);
        this.aimLine.moveTo(x, y);
    }

    private lineTo(x: number, y: number): void {
        this.aimLineShadow.lineTo(x, y);
        this.aimLine.lineTo(x, y);
    }

    private drawAimLine(ballX: number, ballY: number, angle: number): void {
        this.aimLineShadow.clear();
        this.aimLine.clear();

        const aimDir = new Vector2(Math.cos(angle), Math.sin(angle));
        const ballRadius = { x: BALL_RADIUS + 2, y: BALL_RADIUS + 2 };

        const currentPos = aimDir.clone().multiply(ballRadius).add({ x: ballX, y: ballY });
        const rayDirection = aimDir.clone();

        let closestBallDistance = Infinity;
        let closestBallHitPos = new Vector2(0, 0);
        let hitBall: Ball | undefined;

        const BALL_SQR = BALL_RADIUS * BALL_RADIUS;

        for (let i = 0; i < this.balls.length - 1; i++) {
            const ball = this.balls[i]!;
            if (ball.isPocketed) continue;

            const delta = currentPos.clone().subtract(ball.phaserSprite);

            const a = rayDirection.lengthSq();
            const b = delta.dot(rayDirection) * 2;
            const c = delta.lengthSq() - BALL_SQR;

            const discriminant = b * b - 4 * a * c;

            if (discriminant >= 0) {
                const a2 = a * 2;
                const sqrtDisc = Math.sqrt(discriminant);

                const t1 = (-b - sqrtDisc) / a2;
                const t2 = (-b + sqrtDisc) / a2;

                let t = Infinity;
                if (t1 > 0 && t1 < t) t = t1;
                if (t2 > 0 && t2 < t) t = t2;

                if (t < closestBallDistance) {
                    closestBallDistance = t;
                    closestBallHitPos = rayDirection.clone().multiply({ x: t, y: t }).add(currentPos);
                    hitBall = ball;
                }
            }
        }

        const cx = currentPos.x;
        const cy = currentPos.y;

        this.lineStyle(2, 0xffffff);
        this.beginPath();
        this.moveTo(cx, cy);

        if (hitBall) {
            // Drawing line to ball
            const targetX = closestBallHitPos.x;
            const targetY = closestBallHitPos.y;

            this.lineTo(targetX, targetY);
            this.strokePath();

            this.aimLineShadow.strokeCircle(targetX, targetY, 5);
            this.aimLine.strokeCircle(targetX, targetY, 5);

            // Drawing prediction line
            const dx = hitBall.phaserSprite.x - targetX;
            const dy = hitBall.phaserSprite.y - targetY;

            const lineLength = BALL_RADIUS * 4;
            const angle = Math.atan2(dy, dx);

            const endX = targetX + Math.cos(angle) * lineLength;
            const endY = targetY + Math.sin(angle) * lineLength;

            this.moveTo(targetX, targetY);
            this.lineTo(endX, endY);
            this.strokePath();

            let inc = Math.PI * 0.5;
            if (dy < 0) inc = -inc;
            if (dx > 0) inc = -inc;

            // Drawing white ball prediction
            const wAngle = Math.atan2(dy, dx) + inc;

            const wendX = targetX + Math.cos(wAngle) * lineLength * 0.5;
            const wendY = targetY + Math.sin(wAngle) * lineLength * 0.5;

            this.moveTo(targetX, targetY);
            this.lineTo(wendX, wendY);
            this.strokePath();
        } else {
            // Hit wall
            const aimX = aimDir.x;
            const aimY = aimDir.y;

            const { left, right, top, bottom } = this.getTableEdges();

            const dx = aimX > 0 ? right - cx : left - cx;
            const dy = aimY > 0 ? bottom - cy : top - cy;

            const t = Math.min(dx / aimX, dy / aimY);

            this.lineTo(cx + aimX * t, cy + aimY * t);
            this.strokePath();
        }
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
        const innerPadding = 4; // Space between the balls and the rail walls
        const verticalHeight = this.tableHeight * 0.5;
        const horizontalWidth = 61;
        const cornerRadius = 20;

        const startX = this.marginX - railWidth - 20;
        const startY = this.marginY + (this.tableHeight - verticalHeight) / 2;

        const graphics = this.add.graphics();

        const path = new Phaser.Curves.Path(startX + horizontalWidth, startY);
        path.lineTo(startX + cornerRadius, startY);
        path.ellipseTo(cornerRadius, cornerRadius, 270, 180, true);
        path.lineTo(startX, startY + verticalHeight);

        graphics.lineStyle(railWidth, 0x332211, 1);
        path.draw(graphics);

        graphics.lineStyle(railWidth - innerPadding, 0x1a1a1a, 1);
        path.draw(graphics);

        graphics.lineStyle(2, 0x5e4a37, 0.5);

        const outerPath = new Phaser.Curves.Path(startX + horizontalWidth, startY - railWidth / 2);
        outerPath.lineTo(startX + cornerRadius, startY - railWidth / 2);
        outerPath.ellipseTo(cornerRadius + railWidth / 2, cornerRadius + railWidth / 2, 270, 180, true);
        outerPath.lineTo(startX - railWidth / 2, startY + verticalHeight);
        outerPath.draw(graphics);

        const ballRadius = BALL_RADIUS * 0.75;
        const ballSprites: Phaser.GameObjects.Sprite[] = [];
        const ballPositions: Array<{ x: number; y: number }> = [];

        const totalBalls = 14;
        for (let i = 0; i < totalBalls; i++) {
            const t = 0.3 + i * 0.05;
            const pos = path.getPoint(t);

            const sprite = this.add
                .sprite(pos.x, pos.y, POOL_ASSETS.WHITE_BALL)
                .setScale((ballRadius * 2) / 256)
                .setAlpha(0)
                .setVisible(false);

            ballPositions.push({ x: pos.x, y: pos.y });
            ballSprites.push(sprite);
        }

        this.pocketedBallsRail = {
            background: graphics,
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
        const powerMeterHeight = this.tableHeight;
        const powerMeterX = this.marginX + this.tableWidth + 50;
        const powerMeterY = this.marginY + this.tableHeight / 2 - powerMeterHeight / 2;

        // Background
        const background = this.add
            .graphics()
            .fillStyle(0x1a1a1a, 0.9)
            .fillRoundedRect(powerMeterX, powerMeterY, powerMeterWidth, powerMeterHeight, 10);

        const fill = this.add.graphics();

        // Handle (Cue Stick)
        const handle = this.add
            .sprite(powerMeterX + powerMeterWidth / 2, powerMeterY, POOL_ASSETS.CUES.BASIC)
            .setScale(1)
            .setRotation(Math.PI / 2) // Makes it vertical
            .setInteractive({ draggable: true, useHandCursor: true });

        /** * MATH FIX: Calculate bounds based on the visual height of the rotated cue.
         * displayHeight refers to the height of the sprite on screen after scaling/rotation.
         */
        const visualHandleHeight = handle.displayHeight;
        const minY = powerMeterY + visualHandleHeight / 2;
        const maxY = powerMeterY + powerMeterHeight - visualHandleHeight / 2;
        const totalTravelDistance = maxY - minY;

        this.powerMeter = {
            background,
            fill,
            handle,
            isDragging: false,
            power: 0,
            position: { x: powerMeterX, y: powerMeterY },
            size: { width: powerMeterWidth, height: powerMeterHeight, handleHeight: visualHandleHeight },
        };

        handle.on("drag", (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
            if (MODAL_OPEN) return;

            // 1. Clamp the drag position so the cue doesn't leave the meter background
            const clampedY = Phaser.Math.Clamp(dragY, minY, maxY);

            // 2. Update sprite position
            handle.y = clampedY;

            // 3. Calculate power (0 at top, 1 at bottom)
            const power = (clampedY - minY) / totalTravelDistance;

            // Use your existing setter to update visuals/logic
            this.setPower(power);
        });

        // Reset logic on drag end
        handle.on("dragend", () => {
            if (this.powerMeter.power > 0) {
                this.service.hitBalls(this.powerMeter.power, this.cue.rotation);
            }
            this.setPower(0);
            this.powerMeter.isDragging = false;
        });

        this.updatePowerMeterFromPower();
    }

    private updatePowerMeterFromPower(): void {
        // const { power, fill, handle } = this.powerMeter;
        // const { x, y } = this.powerMeter.position;
        // const { width, height, handleHeight } = this.powerMeter.size;
        // const minY = y;
        // const maxY = y + height - handleHeight;
        // const usableHeight = maxY - minY - handleHeight;
        // const handleY = minY + handleHeight / 2 + usableHeight * power;
        // handle.y = handleY;
        // fill.clear();
        // if (power <= 0) return;
        // let color = 0x00ff00; // Green
        // if (power > 0.66) color = 0xff0000; // Red
        // else if (power > 0.33) color = 0xffff00; // Yellow
        // const fillHeight = usableHeight * power;
        // fill.fillRoundedRect(x + 5, minY + 5, width - 10, fillHeight, 5);
        // fill.fillStyle(color, 0.7);
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
