import * as Phaser from "phaser";
import { BALL_RADIUS } from "../common/pool-constants";
import type { Ball, Collider, KeyPositions } from "../common/pool-types";

const MAX_POWER = 20;
const MAX_STEPS = 200;

const Vector2 = Phaser.Math.Vector2;

export class PoolService {
    private balls: Ball[];
    private colliders: Collider[];

    constructor(balls: Ball[], colliders: Collider[]) {
        this.balls = balls;
        this.colliders = colliders;
    }

    public hitBalls(powerPercent: number, angle: number): KeyPositions {
        const whiteball = this.balls.length - 1;
        const velocities = Array.from({ length: this.balls.length }, () => new Vector2());

        velocities[whiteball]!.set(
            Math.cos(angle) * powerPercent * MAX_POWER,
            Math.sin(angle) * powerPercent * MAX_POWER
        );

        return this.simulate(velocities);
    }

    private simulate(velocities: Phaser.Math.Vector2[]): KeyPositions {
        const friction = 0.98;
        const minVelocity = 0.1;
        const collisionDamping = 0.95;

        const keyPositions: KeyPositions = [this.balls.map((b) => new Vector2(b.phaserSprite.x, b.phaserSprite.y))];

        for (let step = 0; step < MAX_STEPS; step++) {
            let anyMoving = false;

            for (let i = 0; i < this.balls.length; i++) {
                const vel = velocities[i]!;
                if (vel.length() < minVelocity) continue;

                anyMoving = true;
                const ball = this.balls[i]!;
                const sprite = ball.phaserSprite;

                sprite.setPosition(sprite.x + vel.x, sprite.y + vel.y);
                vel.multiply({ x: friction, y: friction });
            }

            keyPositions.push(this.balls.map((b) => new Vector2(b.phaserSprite.x, b.phaserSprite.y)));

            // Multiple times just in case
            for (let iteration = 0; iteration < 3; iteration++) {
                for (let i = 0; i < this.balls.length; i++) {
                    const ball1 = this.balls[i]!;
                    const sprite1 = ball1.phaserSprite;

                    for (let j = i + 1; j < this.balls.length; j++) {
                        const ball2 = this.balls[j]!;
                        const sprite2 = ball2.phaserSprite;

                        const dx = sprite2.x - sprite1.x;
                        const dy = sprite2.y - sprite1.y;

                        const distSq = dx * dx + dy * dy;

                        const minDist = BALL_RADIUS * 1.25;
                        const minDistSq = minDist * minDist;

                        if (distSq < minDistSq && distSq > 0) {
                            const distance = Math.sqrt(distSq);
                            const overlap = minDist - distance;

                            const nx = dx / distance;
                            const ny = dy / distance;

                            // push each ball half the overlap distance
                            const overlapOffsetX = overlap * 0.5 * nx;
                            const overlapOffsetY = overlap * 0.5 * ny;

                            sprite1.setPosition(
                                sprite1.x - overlapOffsetX,
                                sprite1.y - overlapOffsetY
                            );
                            sprite2.setPosition(
                                sprite2.x + overlapOffsetX,
                                sprite2.y + overlapOffsetY
                            );

                            // only apply velocity changes on first iteration
                            if (iteration === 0) {
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
                        if (!this.isPointInPolygon(ball1, collider)) continue;

                        if (iteration === 0) {
                            const vel1 = velocities[i]!;
                            const normal = this.getNormal(ball1, collider);

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
                }
            }

            if (!anyMoving) return keyPositions;
        }

        return keyPositions;
    }

    private getNormal(ball: Ball, { sprite: { size: { points } } }: Collider): { x: number, y: number } {
        let minDistance = Infinity;
        let closestNormal = { x: 0, y: 1 };
        const b = new Vector2(ball.phaserSprite.x, ball.phaserSprite.y);

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

        return closestNormal
    }

    private isPointInPolygon(ball: Ball, { sprite: { size: { points } } }: Collider): boolean {
        const { x, y } = ball.phaserSprite;

        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const p1 = points[i]!;
            const p2 = points[j]!;

            const xi = p1.x;
            const yi = p1.y;
            const xj = p2.x;
            const yj = p2.y;

            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
