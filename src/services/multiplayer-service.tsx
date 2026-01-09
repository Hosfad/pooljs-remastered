import React from "react";
import { createRoot } from "react-dom/client";
import { type BallType, type KeyPositions } from "../common/pool-types";
import { Events, type EventsData, type TEventKey } from "../common/server-types";
import type { Player } from "../server";
import { LocalService } from "./local-service";

import { DiscordSDK } from "@discord/embedded-app-sdk";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DEBUG_GRAPHICS, INIT_DISCORD_SDK } from "../common/pool-constants";
import { LoadingPage } from "../scenes/components/react/loading/loading-page";
import { Lobby } from "../scenes/components/react/lobby/lobby";

import MainScreen from "../scenes/components/react/general/main-screen";
import { UIProvider } from "../scenes/components/react/provider";

interface Preferences {
    ballType: BallType;
}

export class MultiplayerService extends LocalService {
    private ws: WebSocket | null = null;
    private eventHandlers = new Map<keyof EventsData, Set<(data: any) => void>>();

    override async connect(): Promise<boolean> {
        const wsUrl = INIT_DISCORD_SDK ? `wss://${location.host}/.proxy/api/ws` : "ws://localhost:6969/ws";
        console.log("Connecting to", wsUrl);

        try {
            if (!this.ws) this.ws = new WebSocket(wsUrl);

            this.ws.onopen = async () => {
                const reactRoot = document.getElementById("react-root");

                if (reactRoot) {
                    const root = createRoot(reactRoot);
                    root.render(
                        <React.StrictMode>
                            <UIProvider service={this}>
                                <BrowserRouter>
                                    <LoadingPage service={this} />
                                    <Routes>
                                        <Route path="/" element={<MainScreen service={this} />}></Route>
                                        <Route path="/lobby" element={<Lobby service={this} />}></Route>
                                    </Routes>
                                </BrowserRouter>
                            </UIProvider>
                        </React.StrictMode>
                    );
                }
                this.send(Events.SHOW_LOADING, { show: true, message: "Pool Game" });

                await this.initDisocrdSDK();
                this.registerEvents();
                setTimeout(() => this.send(Events.SHOW_LOADING, { show: false }), 1500);
            };

            this.ws.onmessage = (e) => {
                const rawStr = e.data;
                const parsed = JSON.parse(rawStr) as {
                    event: TEventKey;
                    data: EventsData[TEventKey];
                };

                const { event, data } = parsed;
                if (!event) return;

                this.eventHandlers.get(event)?.forEach((handler) => handler(data));
            };

            window.addEventListener("beforeunload", () => {
                this.call(Events.PLAYER_DISCONNECT, { userId: this.me()?.id!, roomId: this.getRoomId()! });
                setTimeout(() => this.ws?.close(), 400);
            });

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    public listen<T extends keyof EventsData>(event: T, callback: (data: EventsData[T]) => void) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(callback);
    }

    public call<T extends keyof EventsData>(event: T, data: EventsData[T]) {
        if (!this.ws) {
            console.error("WebSocket is not open");
            return;
        }
        this.ws.send(JSON.stringify({ event, data }));
    }

    public override getPlayers(): Player[] {
        return this.room?.players ?? [];
    }

    override isMyTurn(): boolean {
        if (DEBUG_GRAPHICS) return true;

        const imHost = this.room?.hostId === this.me()?.id;
        const index = this.service.getState().turnIndex;
        return imHost ? index == 0 : index == 1;
    }

    override winner(): string | undefined {
        return this.service.winner();
    }

    override whoseTurn(): BallType {
        return this.service.whoseTurn();
    }

    override hitBalls(powerPercent: number, angle: number): KeyPositions {
        const { userId, roomId } = this.getRoomConfig();
        if (!roomId) return [];

        const keyPositions = this.service.hitBalls(powerPercent, angle);
        const data = { keyPositions: keyPositions, state: this.service.getState(), userId, roomId };

        this.send(Events.HITS, { ...data, userId: "1" });

        const POS_PER_SENT = 100;
        for (let i = 0; i < keyPositions.length; i += POS_PER_SENT) {
            this.call(Events.HITS, { ...data, keyPositions: keyPositions.slice(i, i + POS_PER_SENT) });
        }

        return keyPositions;
    }

    override pull(x: number, y: number, angle: number, power: number): void {
        const { userId, roomId } = this.getRoomConfig();

        if (!roomId) return;

        const data = { x, y, angle, userId, roomId };

        this.send(Events.PULL, { ...data, userId: "1", power: power });
        this.call(Events.PULL, { ...data, userId: "1", power: power });
    }

    override moveHand(x: number, y: number): void {
        const { userId, roomId } = this.getRoomConfig();

        if (!roomId) return;

        this.call(Events.HAND, { x, y, userId, roomId });
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    private getPreferences(): Partial<Preferences> {
        const preferences = sessionStorage.getItem("preferences");
        return preferences ? JSON.parse(preferences) : {};
    }

    public setPref<T extends keyof Preferences>(key: T, value: any) {
        const prefs = this.getPreferences();
        prefs[key] = value;
        sessionStorage.setItem("preferences", JSON.stringify(prefs));
    }

    public getPref<T extends keyof Preferences>(key: T): any {
        return this.getPreferences()[key];
    }

    private async initDisocrdSDK() {
        if (!INIT_DISCORD_SDK) return;

        this.discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_APP_ID);
        await this.discordSdk.ready();

        const me = this.me();
        if (me.access_token) {
            const res = await this.discordSdk.commands.authenticate({ access_token: me.access_token });
            if (!res.user) return console.error("Failed to authenticate with discord", res);
            console.log("Authenticated with discord", res);
        }

        try {
            const { code } = await this.discordSdk.commands.authorize({
                client_id: import.meta.env.VITE_DISCORD_APP_ID!,
                response_type: "code",
                state: "",
                prompt: "none",
                scope: ["identify", "guilds", "guilds.members.read"],
            });
            if (!code) return console.log("No code found");

            const discordUser = await fetch(`/api/api/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code,
                }),
            });
            const data: Partial<Player> = await discordUser.json();
            this.setLocalUser(data);
        } catch (e) {
            console.error("ERROR IN DISCORD AUTHENTICATION", e);
        }
    }

    private handleRedirect(newRoom: string) {
        const roomIdFromUrl = this.getRoomId();
        if (roomIdFromUrl !== newRoom) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("room", newRoom);
            sessionStorage.setItem("roomId", newRoom);
            window.history.replaceState({}, "", newUrl.toString());
        }
    }

    registerEvents() {
        // Room events

        this.listen(Events.JOIN_ROOM_RESPONSE, (data) => {
            const { type } = data;
            if (type === "error") {
                return console.error("Error joining room", data);
            }
            this.instanciateRoom(data.data);
            this.handleRedirect(data.data.id);
            this.send(Events.UPDATE_ROOM, data.data);
        });

        this.listen(Events.MATCH_MAKE_START_RESPONSE, (data) => {
            const { type } = data;
            if (type === "error") {
                const { code: errCode, message: errMessage } = data;
                return;
            }
            this.instanciateRoom(data.data);
            this.send(Events.UPDATE_ROOM, data.data);
        });

        this.listen(Events.MATCH_MAKE_CANCEL_RESPONSE, (data) => {
            const { type } = data;
            if (type === "error") {
                const { code: errCode, message: errMessage } = data;
                return;
            }
            this.send(Events.UPDATE_ROOM, data.data);
        });

        this.listen(Events.PLAYER_DISCONNECT_RESPONSE, (data) => {
            const { type } = data;
            if (type === "error") {
                const { code: errCode, message: errMessage } = data;
                return;
            }
            this.send(Events.UPDATE_ROOM, data.data);
        });

        this.listen(Events.UPDATE_ROOM, (data) => {
            this.instanciateRoom(data);
            this.send(Events.UPDATE_ROOM, data);
        });

        // Game events
        this.listen(Events.HAND, (data) => {
            this.send(Events.HAND, data);
        });

        this.listen(Events.INIT, (data) => {
            this.handleRedirect(data.id);

            this.send(Events.INIT, data);
        });

        this.listen(Events.PULL, (data) => {
            this.send(Events.PULL, data);
        });

        this.listen(Events.HITS, (data) => {
            this.send(Events.HITS, data);
        });
    }
}
