import * as Phaser from "phaser";
import { BALL_RADIUS } from "../common/pool-constants";
import type { Ball, Collider, KeyPositions } from "../common/pool-types";

const MAX_POWER = 20;
const MAX_STEPS = 200;

const Vector2 = Phaser.Math.Vector2;

export class PoolService {

    public hitBalls(balls: Ball[], powerPercent: number, angle: number): KeyPositions {
        const whiteball = balls.length - 1;
        const velocities = Array.from({ length: balls.length }, () => new Vector2());

        velocities[whiteball]!.set(
            Math.cos(angle) * powerPercent * MAX_POWER,
            Math.sin(angle) * powerPercent * MAX_POWER
        );

        return this.simulate(balls, velocities);
    }

    private simulate(balls: Ball[], velocities: Phaser.Math.Vector2[]): KeyPositions {
        const friction = 0.98;
        const minVelocity = 0.1;
        const collisionDamping = 0.95;

        const keyPositions: KeyPositions = [balls.map((b) => new Vector2(b.phaserSprite.x, b.phaserSprite.y))];

        for (let step = 0; step < MAX_STEPS; step++) {
            let anyMoving = false;

            for (let i = 0; i < balls.length; i++) {
                const vel = velocities[i]!;
                if (vel.length() < minVelocity) continue;

                anyMoving = true;
                const ball = balls[i]!;
                const sprite = ball.phaserSprite;

                sprite.setPosition(sprite.x + vel.x, sprite.y + vel.y);
                vel.multiply({ x: friction, y: friction });
            }

            keyPositions.push(balls.map((b) => new Vector2(b.phaserSprite.x, b.phaserSprite.y)));

            // Multiple times just in case
            for (let iteration = 0; iteration < 3; iteration++) {
                for (let i = 0; i < balls.length; i++) {
                    const ball1 = balls[i]!;
                    const sprite1 = ball1.phaserSprite;

                    for (let j = i + 1; j < balls.length; j++) {
                        const ball2 = balls[j]!;
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
                }
            }

            if (!anyMoving) return keyPositions;
        }

        return keyPositions;
    }

    private isPointInPolygon(ball: Ball, { sprite: { size: { points } } }: Collider): boolean {
        let inside = false;
        const { x, y } = ball.phaserSprite;
        const xp = x + BALL_RADIUS, yp = y + BALL_RADIUS;
        const xl = x - BALL_RADIUS, yl = y - BALL_RADIUS;

        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const { x: xi, y: yi } = points[i]!;
            const { x: xj, y: yj } = points[j]!;
            const w = xj - xi;
            const h = yj - yi;

            if (
                (yi > yp !== yj > yp && xp < (w * (yp - yi)) / h + xi) ||
                (yi > yl !== yj > yl && xl > (w * (yl - yi)) / h + xi)
            ) {
                inside = !inside;
            }
        }

        return inside;
    }

    private calculatePenetrationDistance(point: Phaser.Math.Vector2, { sprite: { size: { points } } }: Collider): number {
        let minDistanceSq = Infinity;

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i]!;
            const p2 = points[(i + 1) % points.length]!;

            const edge = p2.subtract(p1);
            const pointToP1 = point.subtract(p1);
            let t = pointToP1.dot(edge) / edge.dot(edge);

            t = Math.max(0, Math.min(1, t));
            const closestPoint = p1.add(edge.multiply({ x: t, y: t }));
            const distanceSq = point.subtract(closestPoint).length();

            minDistanceSq = Math.min(minDistanceSq, distanceSq);
        }

        return Math.sqrt(minDistanceSq) - BALL_RADIUS;
    }
}
