import { BALL_RADIUS } from "../common/pool-constants";
import type { Ball } from "../common/pool-types";
import * as Phaser from "phaser";

const MAX_POWER = 10;
const MAX_STEPS = 200; // Maximum steps to simulate

const Vector2 = Phaser.Math.Vector2;

export class PoolService {
	public hitBalls(balls: Ball[], powerPercent: number, angle: number): void {
		const whiteball = balls.length - 1;
		const velocities = Array.from({ length: balls.length }, () => new Vector2());

		velocities[whiteball]!.set(
			Math.cos(angle) * powerPercent * MAX_POWER,
			Math.sin(angle) * powerPercent * MAX_POWER
		);

		this.simulate(balls, velocities);
	}

	private simulate(balls: Ball[], velocities: Phaser.Math.Vector2[]): void {
		const friction = 0.98;
		const minVelocity = 0.1;
		const collisionDamping = 0.95;

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

						const minDist = BALL_RADIUS * 2;
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
								sprite1.y - overlapOffsetY,
							);
							sprite2.setPosition(
								sprite2.x + overlapOffsetX,
								sprite2.y + overlapOffsetY,
							);

							// only apply velocity changes on first iteration
							if (iteration === 0) {
								const vel1 = velocities[i]!;
								const vel2 = velocities[j]!;

								const dvx = vel1.x - vel2.x;
								const dvy = vel1.y - vel2.y;

								const dvn = dvx * nx + dvy * ny;

								if (dvn < 0) { // only if balls are moving to each other
									const impulse = dvn * collisionDamping;

									const impulseX = impulse * nx;
									const impulseY = impulse * ny;

									vel1.add({ x: impulseX, y: impulseY });
									vel2.subtract({ x: impulseX, y: impulseY });
								}
							}
						}
					}
				}
			}

			if (!anyMoving) break;
		}
	}
}
