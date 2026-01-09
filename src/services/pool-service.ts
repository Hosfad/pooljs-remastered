import * as Phaser from "phaser";
import {
    BALL_RADIUS,
    HOLE_LABEL,
    MAX_POWER,
    MAX_SPEED_MPS,
    MAX_SPIN_RAD_PER_SEC,
    MAX_STEPS,
    METER_TO_PX_PER_FRAME,
    TIMER_DURATION,
    USE_MATTER_JS,
} from "../common/pool-constants";
import type { Ball, BallType, Collider, Collision, Hole, KeyPositions } from "../common/pool-types";
import type { PoolState } from "../common/server-types";
import type { PoolGameScene } from "../scenes/pool-game-scene";

export const Vector2 = Phaser.Math.Vector2;

type Scores = Record<BallType, number>;

export class PoolService {
    private scene: PoolGameScene;

    private colliders: Collider[];
    private balls: Ball[];
    private holes: Hole[];

    private inHole: Record<number, boolean> = {};
    private totals: Scores;
    private players: Scores;
    private collisions: Collision[] = [];

    private timer: Phaser.Time.TimerEvent;
    private timerCount = 0;

    private turns: BallType[];
    private turnIndex = 0;

    constructor(scene: PoolGameScene) {
        this.scene = scene;

        this.balls = scene.balls;
        this.colliders = scene.colliders;
        this.holes = scene.holes;

        this.totals = { solid: 0, striped: 0, white: 0, black: 0 };
        this.players = { solid: 0, striped: 0, white: 0, black: 0 };

        for (const ball of this.balls) this.totals[ball.ballType]++;
        this.turns = Object.keys(this.totals).filter((t) => this.totals[t as BallType] > 1) as BallType[];

        this.timer = scene.time.addEvent({
            delay: 1000,
            callback: () => {
                if (++this.timerCount >= TIMER_DURATION) {
                    this.timerStop();
                    console.log("Timer finished");
                }
            },
            paused: true,
            loop: true,
        });
    }

    public winner(): string | undefined {
        const balls = this.balls.length;
        const blackBall = balls - 2;
        if (this.inHole[blackBall]) {
            const whiteBall = balls - 1;

            const turn = this.whoseTurn();
            const nextTurn = this.turns[(this.turnIndex + 1) % this.turns.length];

            return this.players[turn] === this.totals[turn] && !this.inHole[whiteBall] ? turn : nextTurn;
        }
        return undefined;
    }

    public setInHole(index: number, inHole: boolean) {
        this.inHole[index] = inHole;
    }

    public getState(): PoolState {
        return {
            inHole: this.inHole,
            totals: this.totals,
            players: this.players,
            turnIndex: this.turnIndex,
        } as PoolState;
    }

    public setState(state: PoolState): void {
        this.inHole = state.inHole;
        this.totals = state.totals;
        this.players = state.players;
        this.turnIndex = state.turnIndex;
    }

    public whoseTurn(): BallType {
        return this.turns[this.turnIndex] as BallType;
    }

    public hitBalls(powerPercent: number, angle: number): KeyPositions {
        const whiteball = this.balls.length - 1;
        const velocities = Array.from({ length: this.balls.length }, () => new Vector2());
        const power = powerPercent * MAX_POWER;

        const velX = powerPercent * MAX_POWER * Math.cos(angle);
        const velY = powerPercent * MAX_POWER * Math.sin(angle);

        velocities[whiteball]!.set(velX, velY);

        if (USE_MATTER_JS) {
            const wbody = this.balls[whiteball]!.phaserSprite.body as MatterJS.BodyType;
            this.scene.matter.body.setVelocity(wbody, { x: velX, y: velY });
            //this.scene.matter.body.setAngularVelocity(wbody, velAngular);
            //  this.scene.matter.body.setInertia(wbody, velVertical);
        }

        const turn = this.whoseTurn();
        const points = this.players[turn];
        const keyPositions = this.simulate(velocities);

        this.balls.forEach((b, i) => {
            const key = keyPositions[0]![i]!;
            b.phaserSprite.setPosition(key.position.x, key.position.y);
            b.phaserSprite.visible = !key.hidden;
        });

        if ((this.players[turn] == points && !this.winner()) || this.balls[whiteball]!.isPocketed) {
            this.turnIndex = (this.turnIndex + 1) % this.turns.length;
        }

        return keyPositions;
    }

    public timerStart() {
        this.timer.paused = false;
        this.timerCount = 0;
    }

    public timerLeft(): number {
        return TIMER_DURATION - this.timerCount;
    }

    public timerStop() {
        this.timer.paused = true;
    }

    private getKeyPosition() {
        const width = this.scene.tableWidth;
        const height = this.scene.tableHeight;

        const mx = this.scene.marginX;
        const my = this.scene.marginY;

        return this.balls.map((b, i) => ({
            position: new Vector2((b.phaserSprite.x - mx) / width, (b.phaserSprite.y - my) / height),
            hidden: this.inHole[i] === true,
            collision: this.collisions[i],
        }));
    }

    private simulate(velocities: Phaser.Math.Vector2[]): KeyPositions {
        return USE_MATTER_JS ? this.matter_simulate() : this.classic_simulate(velocities);
    }

    private classic_simulate(velocities: Phaser.Math.Vector2[]): KeyPositions {
        const friction = 0.99;
        const minVelocity = 0.1;
        const collisionDamping = 0.98;

        const keyPositions: KeyPositions = [this.getKeyPosition()];

        let turn = this.whoseTurn();
        if (this.players[turn] == this.totals[turn]) turn = "black";

        for (let step = 0; step < MAX_STEPS; step++) {
            this.collisions.length = 0;
            let anyMoving = false;

            for (let i = 0; i < this.balls.length; i++) {
                if (this.inHole[i]) continue;

                const vel = velocities[i]!;
                if (vel.length() < minVelocity) continue;

                anyMoving = true;
                const ball = this.balls[i]!;
                const sprite = ball.phaserSprite;

                sprite.setPosition(sprite.x + vel.x, sprite.y + vel.y);
                vel.multiply({ x: friction, y: friction });
            }

            // Multiple times just in case
            for (let iteration = 0; iteration < 3; iteration++) {
                for (let i = 0; i < this.balls.length; i++) {
                    if (this.inHole[i]) continue;

                    const ball1 = this.balls[i]!;
                    const sprite1 = ball1.phaserSprite;
                    const b1 = new Vector2(sprite1.x, sprite1.y);

                    for (let j = i + 1; j < this.balls.length; j++) {
                        if (this.inHole[j]) continue;

                        const ball2 = this.balls[j]!;
                        const sprite2 = ball2.phaserSprite;

                        const dx = sprite2.x - sprite1.x;
                        const dy = sprite2.y - sprite1.y;

                        const distSq = dx * dx + dy * dy;

                        const minDist = BALL_RADIUS * 1.5;
                        const minDistSq = minDist * minDist;

                        if (distSq < minDistSq && distSq > 0) {
                            const distance = Math.sqrt(distSq);
                            const overlap = minDist - distance;

                            const nx = dx / distance;
                            const ny = dy / distance;

                            // push each ball half the overlap distance
                            const overlapOffsetX = overlap * 0.8 * nx;
                            const overlapOffsetY = overlap * 0.8 * ny;

                            sprite1.setPosition(sprite1.x - overlapOffsetX, sprite1.y - overlapOffsetY);
                            sprite2.setPosition(sprite2.x + overlapOffsetX, sprite2.y + overlapOffsetY);

                            // only apply velocity changes on first iteration
                            if (iteration === 0) {
                                this.collisions[i] = "ball";

                                const vel1 = velocities[i]!;
                                const vel2 = velocities[j]!;

                                const dvx = vel1.x - vel2.x;
                                const dvy = vel1.y - vel2.y;

                                const dvn = dvx * nx + dvy * ny;

                                if (dvn > 0) {
                                    // only if balls are moving to each other
                                    const impulse = dvn * collisionDamping;

                                    const impulseX = impulse * nx;
                                    const impulseY = impulse * ny;

                                    vel1.subtract({ x: impulseX, y: impulseY });
                                    vel2.add({ x: impulseX, y: impulseY });
                                }
                            }
                        }
                    }

                    for (const collider of this.colliders) {
                        if (!this.isPointInPolygon(b1, collider)) continue;

                        if (iteration === 0) {
                            this.collisions[i] = "wall";

                            const vel1 = velocities[i]!;
                            const normal = this.getNormal(b1, collider);

                            // velocity component along normal
                            const velDotNormal = vel1.dot(normal);

                            // moving into the wall
                            if (velDotNormal > 0) {
                                // v' = v - 2*(v*n)*n
                                const reflectionFactor = 2 * velDotNormal * collisionDamping;
                                vel1.subtract({ x: reflectionFactor * normal.x, y: reflectionFactor * normal.y });
                            }
                        }
                    }

                    for (const hole of this.holes) {
                        if (b1.distance(hole.sprite.position) <= BALL_RADIUS * 2.25) {
                            this.inHole[i] = true;
                            this.players[ball1.ballType]++;
                            this.collisions[i] = "hole";
                            break;
                        }
                    }
                }
            }

            keyPositions.push(this.getKeyPosition());

            if (!anyMoving) break;
        }

        return keyPositions;
    }

    private matter_simulate(): KeyPositions {
        const keyPositions: KeyPositions = [this.getKeyPosition()];
        const frameRate = 16.66; // 60 fps delta
        const minVelocity = 0.1;

        this.scene.matter.world.addListener("collisionstart", (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;

                if (bodyA.label === HOLE_LABEL || bodyB.label === HOLE_LABEL) {
                    const targetBody = bodyA.label === HOLE_LABEL ? bodyB : bodyA;
                    const ball = this.balls.findIndex((b) => b.phaserSprite.body === targetBody);
                    if (ball >= 0) this.inHole[ball] = true;
                }
            });
        });

        for (let step = 0; step < MAX_STEPS; step++) {
            let anyMoving = false;

            this.scene.matter.world.step(frameRate);

            for (let i = 0; i < this.balls.length; i++) {
                const ball = this.balls[i]!;

                if (this.inHole[i] || !ball.phaserSprite.body) continue;

                const velocity = new Vector2(ball.phaserSprite.body.velocity);

                if (velocity.length() > minVelocity) {
                    anyMoving = true;
                }
            }

            keyPositions.push(this.getKeyPosition());

            if (!anyMoving) break;
        }

        this.scene.matter.world.removeListener("collisionstart");

        return keyPositions;
    }

    private getNormal(
        b: Phaser.Math.Vector2,
        {
            sprite: {
                size: { points },
            },
        }: Collider
    ): { x: number; y: number } {
        let minDistance = Infinity;
        let closestNormal = { x: 0, y: 1 };

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i]!;
            const p2 = points[(i + 1) % points.length]!;

            const edge = p2.clone().subtract(p1);
            const toball = b.clone().subtract(p1);
            const t = Phaser.Math.Clamp(toball.dot(edge) / edge.lengthSq(), 0, 1);

            const closest = edge.multiply({ x: t, y: t }).add(p1);
            const delta = b.clone().subtract(closest);
            const distance = delta.length();

            if (distance < minDistance) {
                minDistance = distance;
                if (distance > 0) closestNormal = delta.normalize();
            }
        }

        return closestNormal;
    }

    public isPointInPolygon(
        b: Phaser.Math.Vector2,
        {
            sprite: {
                size: { points },
            },
        }: Collider
    ): boolean {
        const { x, y } = b;

        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const p1 = points[i]!;
            const p2 = points[j]!;

            const xi = p1.x;
            const yi = p1.y;
            const xj = p2.x;
            const yj = p2.y;

            const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    }

    public calculateShotPhysics(
        powerPercentage: number,

        angleRadians: number,

        horizontalOffset: number = 0,

        verticalOffset: number = 0
    ) {
        const clampedPower = Phaser.Math.Clamp(powerPercentage, 0, 50);

        let normalizedPower = clampedPower / 100;

        normalizedPower = Math.pow(normalizedPower, 2);

        const targetSpeedMps = normalizedPower * MAX_SPEED_MPS;

        const linearMagnitude = targetSpeedMps * METER_TO_PX_PER_FRAME;

        const horizontalSafeOffset = Phaser.Math.Clamp(horizontalOffset, -0.8, 0.8);

        const angularVelocity = normalizedPower * horizontalSafeOffset * MAX_SPIN_RAD_PER_SEC;

        // TODO: adjust this depending on the sticks spin efficiency (pay to win xD)

        const deflectionAmount = 0;

        const deflectedVx = Math.cos(angleRadians - horizontalSafeOffset * deflectionAmount) * linearMagnitude;

        const deflectedVy = Math.sin(angleRadians - horizontalSafeOffset * deflectionAmount) * linearMagnitude;

        const verticalSafeOffset = Phaser.Math.Clamp(verticalOffset, -0.8, 0.8);

        const verticalVelocity = normalizedPower * verticalSafeOffset * MAX_SPIN_RAD_PER_SEC;

        return {
            x: deflectedVx,

            y: deflectedVy,

            angular: angularVelocity,

            vertical: verticalVelocity,
        };
    }
}
