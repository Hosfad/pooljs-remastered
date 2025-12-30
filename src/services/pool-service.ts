import { BALL_RADIUS } from "../common/pool-constants";
import type { Ball } from "../common/pool-types";

const MAX_POWER = 10;
const DISTANCE = 50;

export class PoolService {
	public hitBalls(balls: Ball[], powerPercent: number, angle: number): void {
		const id = balls.length - 1; // White ball
		this.applyPower(balls, powerPercent, angle, id, { [id]: true });
	}

	public applyPower(balls: Ball[], powerPercent: number, angle: number, ballId: number, collisions: Record<number, boolean>): void {
		const mainBall = balls[ballId]!;
		const sprite = mainBall.phaserSprite;
		let { x, y } = sprite;

		for (let i = 0; i < DISTANCE; i++) {
			x += Math.cos(angle) * powerPercent * MAX_POWER;
			y += Math.sin(angle) * powerPercent * MAX_POWER;
			for (let j = 0; j < balls.length; j++) {
				if (collisions[j]) continue; // skip if already hit

				const ball = balls[j]!;
				const ballSprite = ball.phaserSprite;
				const distance = Math.sqrt(Math.pow(x - ballSprite.x, 2) + Math.pow(y - ballSprite.y, 2));

				if (distance < BALL_RADIUS * 1.25) { // 25% more of ball radius, bigger hitbox
					collisions[j] = true;
					// Half the power after collision?
					this.applyPower(balls, powerPercent * 0.5, angle, j, { [j]: true, [ballId]: true });
					const transferDistance = Math.floor((DISTANCE - i) * 0.5);
					i += transferDistance; // Half the traveled distance after collision

					angle *= -1; // Use that transfered distance to reverse the angle
					for (let k = 0; k < transferDistance; k++) {
						x -= Math.cos(angle) * powerPercent * MAX_POWER;
						y -= Math.sin(angle) * powerPercent * MAX_POWER;
					}
				}
			}
		}

		sprite.setPosition(x, y);
	}
}
