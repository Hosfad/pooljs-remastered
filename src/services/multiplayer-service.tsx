import React from "react";
import { createRoot } from "react-dom/client";
import { type BallType, type KeyPositions } from "../common/pool-types";
import {
    BroadcastEvent,
    Events,
    type EventsData,
    type RoomEventBodyOptions,
    type TEventKey,
    type WebsocketError,
} from "../common/server-types";
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

    public listen<T extends TEventKey>(event: T,
        callback: (
            body:
                | {
                    type: "success";
                    data: EventsData[T] & RoomEventBodyOptions;
                }
                | {
                    type: "error";
                    data: { message: string; code: WebsocketError } & RoomEventBodyOptions;
                }
        ) => void
    ) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }

        this.eventHandlers.get(event)!.add(callback);
    }

    public call<T extends keyof EventsData>(
        event: T,
        data: EventsData[T],
        broadcastEvent: BroadcastEvent = BroadcastEvent.ALL
    ) {
        if (!this.ws) {
            console.error("WebSocket is not open");
            return;
        }

        const roomData = this.getRoomConfig();
        if (!roomData.roomId || !roomData.userId) return;

        this.ws.send(
            JSON.stringify({ event, data: { ...data, broadcastEvent, roomId: roomData.roomId, senderId: roomData.userId } })
        );
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
        const keyPositions = this.service.hitBalls(powerPercent, angle);
        const data = { keyPositions: keyPositions, state: this.service.getState() };

        this.send(Events.HITS, { ...data });

        const POS_PER_SENT = 100;
        for (let i = 0; i < keyPositions.length; i += POS_PER_SENT) {
            this.call(
                Events.HITS,
                { ...data, keyPositions: keyPositions.slice(i, i + POS_PER_SENT) },
                BroadcastEvent.OTHERS
            );
        }

        return keyPositions;
    }

    override pull(x: number, y: number, angle: number, power: number): void {
        if (!this.getRoomConfig().roomId) return;
        this.send(Events.PULL, { x, y, angle, power });
        this.call(Events.PULL, { x, y, angle, power }, BroadcastEvent.OTHERS);
    }

    override moveHand(x: number, y: number, click: boolean): void {
        this.send(Events.HAND, { x, y, click });
        this.call(Events.HAND, { x, y, click }, BroadcastEvent.OTHERS);
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
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
            console.log({ roomIdFromUrl, newRoom });
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("room", newRoom);
            sessionStorage.setItem("roomId", newRoom);
            window.history.replaceState({}, "", newUrl.toString());
        }
    }

    registerEvents() {
        // Room events

        this.listen(Events.JOIN_ROOM_RESPONSE, (body) => {
            const { type } = body;
            if (type === "error") {
                return console.error("Error joining room", body);
            }
            const { data } = body;

            this.instanciateRoom(data);
            this.handleRedirect(data.id);
            this.send(Events.UPDATE_ROOM, data);
        });

        this.listen(Events.MATCH_MAKE_START_RESPONSE, (body) => {
            const { type } = body;
            if (type === "error") {
                return console.error("Error in MATCH_MAKE_START_RESPONSE", body);
            }
            this.instanciateRoom(body.data);
            this.send(Events.UPDATE_ROOM, body.data);
        });

        this.listen(Events.MATCH_MAKE_CANCEL_RESPONSE, (body) => {
            const { type } = body;
            if (type === "error") {
                return console.error("Error in MATCH_MAKE_CANCEL_RESPONSE", body);
            }
            this.send(Events.UPDATE_ROOM, body.data);
        });

        this.listen(Events.PLAYER_DISCONNECT_RESPONSE, (body) => {
            if (body.type === "error") {
                return console.error("Error in PLAYER_DISCONNECT_RESPONSE", body);
            }
            this.send(Events.UPDATE_ROOM, body.data);
        });

        this.listen(Events.UPDATE_ROOM, (body) => {
            if (body.type === "error") return console.error("Error in UPDATE_ROOM", body);
            this.instanciateRoom(body.data);
            this.send(Events.UPDATE_ROOM, body.data);
        });

        const gameEvents = [
            Events.INIT,
            Events.PULL,
            Events.HITS,
            Events.HAND,
            Events.DROP_BALL,
            Events.DRAG_POWER_METER,
            Events.POWER_METER_HIT,
        ] as const;

        gameEvents.forEach((event) => {
            this.listen(event as TEventKey, (body) => {
                if (body.type === "error") return console.error("Error in ", event, body);
                this.send(event as TEventKey, body.data);
            });
        });
    }
}
