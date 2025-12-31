import { insertCoin, isHost, me, onPlayerJoin, RPC, type PlayerState } from "playroomkit";
import { Events, Service } from "./service";
import { Player } from "../api/connect-four";

export class PlayroomService extends Service {
    static readonly MAX_PLAYERS = 2;
    players: { [key: string]: PlayerState } = {};

    async connect(): Promise<boolean> {
        try {
            this.registerEvents();
            await insertCoin({
                maxPlayersPerRoom: PlayroomService.MAX_PLAYERS,
                defaultPlayerStates: {
                    player: Player.NONE,
                },
            }, () => {
                if (!isHost()) return;
                const amountPlayers = Object.keys(this.players).length;
                let red = "";
                let yellow = "";

                Object.values(this.players).forEach((player, i) => {
                    if (amountPlayers === PlayroomService.MAX_PLAYERS) {
                        player.setState('player', Player[i === 0 ? 'ONE' : 'TWO']);
                    } else if (player.getState('player') === Player.NONE) {
                        player.setState('player', me().getState('player') == Player.ONE ? Player.TWO : Player.ONE);
                    }

                    const photo = player.getProfile().photo;
                    if (player.getState('player') === Player.ONE) {
                        red = photo;
                    } else {
                        yellow = photo;
                    }
                });

                RPC.call(Events.GAME_START, { red, yellow }, RPC.Mode.ALL);
            });
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    reload(): void {
        RPC.call(Events.WAITING, undefined, RPC.Mode.ALL);
    }

    public override winnerText(): string {
        return this.winner() && !this.isCurrentPlayer() ? "You Win!" : "Opponent Wins!";
    }

    public override isCurrentPlayer(): boolean {
        return this.connectFour.currentPlayer === me().getState('player');
    }

    public override whoseTurn(): string {
        for (const player of Object.values(this.players)) {
            if (player.getState('player') === this.connectFour.currentPlayer) {
                return player.getProfile().name + '\'s turn';
            }
        }
        return "Nobody.";
    }

    setPiecePosition(x: number): void {
        RPC.call(Events.HOVER, x, RPC.Mode.ALL);
    }

    makeMove(x: number): void {
        RPC.call(Events.MOVE, x, RPC.Mode.ALL);
    }

    registerEvents() {
        RPC.register(Events.GAME_START, async (data) => {
            this.events.emit(Events.GAME_START, data);
        });

        RPC.register(Events.HOVER, async (x) => {
            this.events.emit(Events.HOVER, x);
        });

        RPC.register(Events.WAITING, async () => {
            window.location.reload();
        });

        RPC.register(Events.MOVE, async (x) => {
            const data = this.connectFour.makeMove(x);
            this.events.emit(Events.MOVE, data);
        });

        onPlayerJoin((player) => {
            this.players[player.id] = player;
            player.onQuit(() => {
                delete this.players[player.id];
            });
        });
    }
}


