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
import { type Ball, type BallType, type Collider, type Cue, type Hole, type KeyPositions } from "../common/pool-types";
import { MultiplayerService } from "../services/multiplayer-service";
import { PoolService } from "../services/pool-service";
import { Events } from "../services/service";
import { DebugPanelModal } from "./components/debug-panel-modal";
import { SettingsModal } from "./components/settings-modal";
import type { PlayerProfile } from "playroomkit";

const Vector2 = Phaser.Math.Vector2;

export class PoolGameScene extends Phaser.Scene {
    private debugPanel?: DebugPanelModal;
    private service!: MultiplayerService;
    private keyPositions: KeyPositions = [];

    private isGameStarted = false;

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
        position: { x: number; y: number; };
        size: { width: number; height: number; handleHeight: number; };
    };

    // Graphics
    private background!: Phaser.GameObjects.Image;
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
    private isMobile = false;

    private gameInfoHeader!: {
        player1Avatar: Phaser.GameObjects.Sprite & { startBlinking: () => void; stopBlinking: () => void };
        player1Name: Phaser.GameObjects.Text;

        player2Avatar: Phaser.GameObjects.Sprite & { startBlinking: () => void; stopBlinking: () => void };
        player2Name: Phaser.GameObjects.Text;

        roundCounter: Phaser.GameObjects.Text;
        roundNumber: number;
        spectatorAvatars: Phaser.GameObjects.Sprite[] | null;
        spectatorNames: Phaser.GameObjects.Text[] | null;
    };

    private pocketedBallsRail!: {
        background: Phaser.GameObjects.Graphics;
        ballPositions: Array<{ x: number; y: number }>;
        ballSprites: Phaser.GameObjects.Sprite[];
        pocketedBalls: Array<{ ball: Ball; positionIndex: number; isAnimating: boolean }>;
        animationTweens: Phaser.Tweens.Tween[];
    };

    private players: (PlayerProfile & { ballType: BallType })[] = [];

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

        this.service = new MultiplayerService(new PoolService(this.balls, this.colliders, this.holes));

        // Create UI
        this.createCue();
        this.createPowerMeter();
        this.createUI();
        this.createPocketedBallsRail();

        // Setup input
        this.registerEvents();
        this.setupInput();

        this.service.connect();
    }

    private updatePlayerTurn() {
        const turn = this.service.whoseTurn().toUpperCase();
        const currentPlayer = this.players.findIndex((p) => p.ballType.toLowerCase() === turn.toLowerCase());
        if (!this.gameInfoHeader) return;

        this.gameInfoHeader.roundNumber++;
        this.gameInfoHeader.roundCounter.setText(
            `Round: ${this.gameInfoHeader.roundNumber}\n\nTurn:\n${turn.toLowerCase()}`
        );

        if (currentPlayer === -1) return;
        const avatar = currentPlayer === 0 ? this.gameInfoHeader.player1Avatar : this.gameInfoHeader.player2Avatar;
        const otherBorder = currentPlayer === 0 ? this.gameInfoHeader.player2Avatar : this.gameInfoHeader.player1Avatar;
        otherBorder.startBlinking();
        this.time.delayedCall(200, () => otherBorder.stopBlinking());
        avatar.startBlinking();
    }

    private registerEvents() {
        this.service.subscribe(Events.INIT, ({ players }) => {
            this.players = players;

            this.loadAavatarsAndCreateInfoHeader();

            this.isGameStarted = true;
            console.log("Pool game initialized with", this.balls.length, "balls");
        });

        this.service.subscribe(Events.PULL, ({ x, y, angle }) => {
            this.updateCueBullback(x, y, angle);
        });

        this.service.subscribe(Events.HITS, ({ keyPositions, state }) => {
            this.keyPositions = keyPositions;
            this.service.setState(state);

            this.updatePlayerTurn();

            this.checkForNewlyPocketedBalls();
        });
    }
    private loadAavatarsAndCreateInfoHeader(): void {
        if (!this.players) return;
        const player1 = this.players[0];
        const player2 = this.players[1];
        if (!player1 || !player2) return;
        this.load.image("player1Avatar", player1.photo);
        this.load.image("player2Avatar", player2.photo);
        this.load.once(Phaser.Loader.Events.COMPLETE, () => {
            this.createGameInfoHeader();
            this.updatePlayerTurn();
        });
        this.load.start();
    }

    private calculateTableDimensions(): void {
        const canvas = this.game.scale.canvas;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const marginPercentage = 0.1;
        const maxMargin = 100;
        const topMargin = 100;

        this.marginX = Math.min(canvasWidth * marginPercentage, maxMargin);
        this.marginY = Math.min(canvasHeight * marginPercentage, maxMargin) + topMargin;

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
        if (!this.isGameStarted) return;

        this.input.enabled = !this.keyPositions.length && this.service.isMyTurn();

        this.updateCue();
        this.updateKeyPositions();
        this.checkForNewlyPocketedBalls();

        this.debugPanel?.update();
    }

    private createUI() {
        this.settingsModal = new SettingsModal(this, this.cameras.main.centerX, this.cameras.main.centerY);

        const buttonStyle = {
            fontFamily: '"Courier New", monospace',
            fontSize: "20px",
            color: "#ffd700",
            backgroundColor: "#4a3520",
            padding: { x: 15, y: 10 },
            stroke: "#8b4513",
            strokeThickness: 2,
        };

        const buttonPosition = this.toTableCoordinates(this.tableWidth + 200, -50);
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
        cueSprite.setScale(0.6);
        cueSprite.setFlipX(true);

        this.cue = { phaserSprite: cueSprite, rotation: 0, power: 0 };
    }

    private createColliders(): void {
        const CUSHION_CONSTANTS = {
            SIDE_INNER_X: 0, // Inner edge x position
            SIDE_OUTER_X: 1.0, // Outer edge x position
            SIDE_THICKNESS_X: 0, // Thickness in x direction
            SIDE_TOP_Y: 0.8, // Top inset
            SIDE_BOTTOM_Y: 1.8, // Bottom inset

            // Top/bottom cushion dimensions (horizontal rails)
            RAIL_OUTER_Y: 0, // Outer edge y position
            RAIL_INNER_Y: 1.3, // Inner edge y position
            RAIL_THICKNESS_Y: 1.3, // Thickness in y direction (RAIL_INNER_Y - RAIL_OUTER_Y adjusted)
            RAIL_SIDE_X: 0.6, // Side inset
            RAIL_CORNER_X: 1.4, // Corner diagonal inset
            RAIL_POCKET_OUTER: 2.14, // Outer pocket edge divisor
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

        frame.forEach((key, i) => {
            const sprite = this.balls[i]!.phaserSprite;
            if (!sprite.visible && i < this.balls.length - 1) return;

            const pos = key.position;
            if (pos.x + pos.y != sprite.x + sprite.y) sprite.rotation += 0.1;
            sprite.setPosition(pos.x, pos.y);
            // increment rotation angle of sprite
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
                this.sound.addListener(
                    "stop",
                    () => {
                        this.playedSounds[i] = undefined;
                    },
                    { once: true }
                );
            }
        });
    }

    private createBall(x: number, y: number, ballType: Ball["ballType"], texture: string) {
        const r = BALL_RADIUS;
        const position = this.toTableCoordinates(x, y);

        const sprite = this.add.sprite(position.x, position.y, texture);
        sprite.setScale((r * 1.5) / sprite.width);

        const ball: Ball = {
            ballType,
            phaserSprite: sprite,
            isPocketed: false,
        };

        this.balls.push(ball);
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

            if ((this.isMobile && this.powerMeter.isDragging) || (!this.isMobile && this.isDraggingShot)) {
                this.sound.play(POOL_ASSETS.SOUND_EFFECTS.CUE_HIT_WHITE_BALL);
                this.service.hitBalls(this.powerMeter.power, this.cue.rotation);
                this.setPower(0);
            }

            this.isDraggingShot = false;
        });
    }

    private updateCueBullback(x: number, y: number, angle: number) {
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
        if (!this.cue.phaserSprite) return;

        const whiteBall = this.balls[this.balls.length - 1]!;
        const { x, y } = whiteBall.phaserSprite!;

        let angle: number;

        if (!this.input.enabled) {
            this.aimLine.clear();
            return;
        }

        if (this.isMobile && this.powerMeter.isDragging) {
            // Still show aim line with current angle
            this.drawAimLine(x, y, this.cue.rotation);
            this.service.pull(x, y, this.cue.rotation);
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
        this.service.pull(x, y, angle);
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
            WINNER: () => (this.service.winner() ? "WINNER" : ""),
        });
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

    // GAME INFO HEADER

    private createGameInfoHeader(): void {
        const canvasWidth = this.game.scale.canvas.width;
        const headerHeight = 100;
        const headerY = 80;

        const padding = 500;
        const nameOffset = 10;
        const spectatorAvatarSize = 40;
        const spectatorSpacing = 30;

        const players = this.players;
        const spectators = this.players;

        if (players.length === 0) return;

        const rightPadding = canvasWidth - padding;
        const centerY = headerY + headerHeight / 2;

        const headerContainer = this.add.container(0, 0);

        const player1 = players[0];
        let player1Avatar: Phaser.GameObjects.Sprite & { startBlinking?: () => void; stopBlinking?: () => void };
        let player1Name: Phaser.GameObjects.Text;
        let player1BlinkTween: Phaser.Tweens.Tween;

        if (player1) {
            player1Avatar = this.add
                .sprite(padding, centerY, "player1Avatar")
                .setScale(0.8)
                .setOrigin(0.5, 0.5)
                .setVisible(true);

            player1Name = this.add
                .text(player1Avatar.x, player1Avatar.y + nameOffset, `${player1.name} (${player1.ballType})`, {
                    fontFamily: "Arial",
                    fontSize: "20px",
                    color: "#ffffff",
                    fontStyle: "bold",
                })
                .setOrigin(0.5, 0);

            player1BlinkTween = this.tweens.add({
                targets: [player1Avatar, player1Name],
                scale: { from: 0.8, to: 0.85 },
                alpha: { from: 0.75, to: 0.95 },
                duration: 800,
                ease: "Sine.easeInOut",
                yoyo: true,
                repeat: -1,
                paused: true,
            });

            player1Avatar.startBlinking = () => player1BlinkTween.play();

            player1Avatar.stopBlinking = function () {
                player1BlinkTween.pause();
                player1BlinkTween.seek(0);
                this.setAlpha(0.2);
            };

            headerContainer.add([player1Avatar, player1Name]);
        }

        let spectatorAvatars: Phaser.GameObjects.Sprite[] = [];
        let spectatorNames: Phaser.GameObjects.Text[] = [];

        if (spectators.length > 0) {
            const spectatorsStartX = canvasWidth / 2;
            const spectatorsY = headerY;

            const totalSpectatorsWidth = spectators.length * spectatorAvatarSize + (spectators.length - 1) * spectatorSpacing;

            let currentX = spectatorsStartX - totalSpectatorsWidth / 2 + spectatorAvatarSize / 2;

            spectators.forEach((spectator, index) => {
                const avatarTexture = index === 0 ? "player1Avatar" : "player2Avatar";

                const spectatorAvatar = this.add
                    .sprite(currentX, spectatorsY, avatarTexture)
                    .setScale(spectatorAvatarSize / 100)
                    .setOrigin(0.5, 0.5)
                    .setAlpha(0.7)
                    .setInteractive({ useHandCursor: true });

                spectatorAvatar
                    .on("pointerover", () => {
                        spectatorAvatar.setAlpha(1);
                    })
                    .on("pointerout", () => {
                        spectatorAvatar.setAlpha(0.7);
                    });

                spectatorAvatars.push(spectatorAvatar);
                headerContainer.add([spectatorAvatar]);

                currentX += spectatorAvatarSize + spectatorSpacing;
            });
        }

        const roundCounter = this.add
            .text(canvasWidth / 2, centerY, "Round: 1", {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#ffd700",
                fontStyle: "bold",
            })
            .setOrigin(0.5, 0.5);

        headerContainer.add(roundCounter);

        const player2 = players[1];
        let player2Avatar: (Phaser.GameObjects.Sprite & { startBlinking?: () => void; stopBlinking?: () => void }) | null = null;
        let player2Name: Phaser.GameObjects.Text | null = null;
        let player2BlinkTween: Phaser.Tweens.Tween | null = null;

        if (player2) {
            player2Avatar = this.add
                .sprite(rightPadding, centerY, "player2Avatar")
                .setScale(0.8)
                .setOrigin(0.5, 0.5)
                .setVisible(true);

            player2Name = this.add
                .text(player2Avatar.x, player2Avatar.y + nameOffset, `${player2.name} (${player2.ballType})`, {
                    fontFamily: "Arial",
                    fontSize: "20px",
                    color: "#ffffff",
                    fontStyle: "bold",
                })
                .setOrigin(0.5, 0);

            player2BlinkTween = this.tweens.add({
                targets: [player2Avatar, player2Name],
                scale: { from: 0.8, to: 0.85 },
                alpha: { from: 0.75, to: 0.95 },
                duration: 800,
                ease: "Sine.easeInOut",
                yoyo: true,
                repeat: -1,
                paused: true,
            });

            player2Avatar.startBlinking = function () {
                player2BlinkTween!.play();
            };

            player2Avatar.stopBlinking = function () {
                player2BlinkTween!.pause();
                player2BlinkTween!.seek(0);
                this.setAlpha(0.3);
            };

            headerContainer.add([player2Avatar, player2Name]);
        } else {
            if (spectators.length === 0) {
                const waitingText = this.add
                    .text(rightPadding, centerY, "Waiting for Player 2...", {
                        fontFamily: "Arial",
                        fontSize: "18px",
                        color: "#888888",
                        fontStyle: "italic",
                    })
                    .setOrigin(0.5, 0.5);
                headerContainer.add(waitingText);
            }
        }

        this.gameInfoHeader = {
            player1Avatar: player1Avatar! as Phaser.GameObjects.Sprite & {
                startBlinking: () => void;
                stopBlinking: () => void;
            },
            player1Name: player1Name!,
            player2Avatar: player2Avatar as Phaser.GameObjects.Sprite & {
                startBlinking: () => void;
                stopBlinking: () => void;
            },
            player2Name: player2Name!,
            spectatorAvatars: spectatorAvatars,
            spectatorNames: spectatorNames,
            roundCounter,
            roundNumber: 0,
        };
    }

    // POCKETED BALLS RAIL

    private createPocketedBallsRail(): void {
        const railWidth = 40;
        const railHeight = this.tableHeight * 0.8;
        const railX = this.marginX - railWidth - 20;
        const railY = this.marginY + (this.tableHeight - railHeight) / 2;
        const ballRadius = BALL_RADIUS * 0.75;

        const background = this.add.graphics()
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
                const x = startX;
                const y = startY + row * verticalSpacing;
                ballPositions.push({ x, y });
            }
        }

        const ballSprites: Phaser.GameObjects.Sprite[] = [];
        ballPositions.forEach((pos) => {
            const emptySprite = this.add
                .sprite(pos.x, pos.y, POOL_ASSETS.WHITE_BALL)
                .setScale((ballRadius * 2) / 256)
                .setAlpha(0)
                .setVisible(false);
            ballSprites.push(emptySprite);
        });

        this.pocketedBallsRail = {
            background,
            ballPositions,
            ballSprites,
            pocketedBalls: [],
            animationTweens: [],
        };
    }

    private checkForNewlyPocketedBalls(): void {
        const allBalls = this.balls.slice(0, this.balls.length - 1);

        allBalls.forEach((ball, index) => {
            if (!ball.phaserSprite.visible && !ball.isPocketed) {
                const alreadyPocketed = this.pocketedBallsRail.pocketedBalls.some((pb) => pb.ball === ball);

                if (!alreadyPocketed) {
                    ball.isPocketed = false;
                    this.animateBallToRail(ball, index);
                }
            }
        });
    }

    private animateBallToRail(ball: Ball, ballIndex: number): void {
        const positionIndex = this.pocketedBallsRail.ballPositions.length - 1 - this.pocketedBallsRail.pocketedBalls.length;

        if (positionIndex < 0) {
            console.warn("Rail is full!");
            return;
        }

        const targetPosition = this.pocketedBallsRail.ballPositions[positionIndex];
        if (!targetPosition) return;

        const dropStartPosition = { x: targetPosition.x, y: this.marginY - 50 };
        const sprite = ball.phaserSprite;
        const ballClone = this.add
            .sprite(sprite.x, sprite.y, sprite.texture.key)
            .setScale(ball.phaserSprite.scale)
            .setAlpha(0.8);

        this.pocketedBallsRail.pocketedBalls.push({ ball, positionIndex, isAnimating: true });

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

                        const pocketedBall = this.pocketedBallsRail.pocketedBalls.find((pb) => pb.ball === ball);
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
                this.pocketedBallsRail.ballSprites[pocketedBall.positionIndex]?.
                    setTexture(pocketedBall.ball.phaserSprite.texture.key)
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
        const background = this.add.graphics()
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
        return px >= x && px <= x + width && py >= y && py <= y + height
    }

    private setPower(power: number): void {
        this.powerMeter.power = power;
        this.updatePowerMeterFromPower();
    }
}
