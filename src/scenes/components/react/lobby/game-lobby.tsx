"use client";

import { ArrowLeft, CheckIcon, Loader, ShareIcon, UsersIcon } from "lucide-react";
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { INIT_DISCORD_SDK } from "../../../../common/pool-constants";
import { Events } from "../../../../common/server-types";
import type { Room } from "../../../../server";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Button } from "../ui/button";

export function Lobby({ service }: { service: MultiplayerService }) {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());

    useEffect(() => {
        const me = service.me();
        service.call(Events.JOIN_ROOM, { ...me, userId: me.id, roomId: service.getRoomId()! });

        service.subscribe(Events.UPDATE_ROOM, (data) => {
            setRoom(data);
            setVisible(true);
        });

        service.subscribe(Events.INIT, (data) => {
            setVisible(false);
        });
    }, []);
    const lobbyState = room?.isMatchMaking ? "matchmaking" : "lobby";
    const [visible, setVisible] = React.useState(!room?.isGameStarted);
    const [hasCopied, setHasCopied] = React.useState(false);

    React.useEffect(() => {
        const lockOrientation = async () => {
            if (window.screen.orientation && "lock" in window.screen.orientation) {
                try {
                    // @ts-ignore
                    await window.screen.orientation.lock("landscape");
                } catch (err) {
                    console.log("Orientation lock not supported or failed:", err);
                }
            }
        };

        if (window.innerWidth < 768) {
            lockOrientation();
        }
    }, []);

    const players = room?.players ?? [];
    const me = service.me();
    const currentPlayer = me;

    const handleStartMatchmaking = () => {
        if (!room) return;
        if (currentPlayer?.id !== room.hostId) return alert("Only the host can start matchmaking");

        if (players.length >= 2) return;
        service.call(Events.MATCH_MAKE_START, { userId: currentPlayer.id, roomId: room.id });
    };

    const handleCancelMatchmaking = () => {
        if (!room || !currentPlayer) return;
        service.call(Events.MATCH_MAKE_CANCEL, { userId: currentPlayer.id, roomId: room.id });
    };
    const handleInvite = () => {
        if (INIT_DISCORD_SDK) {
            console.log("Opening invite dialog");
            service.discordSdk?.commands.openInviteDialog();
        }
        if (!room) return;
        setHasCopied(true);
        navigator.clipboard.writeText(window.location.href + "?room=" + room.id);
        service.showErrorModal({
            title: "Invite link copied to clipboard!",
            closeAfter: 1500,
        });
        setTimeout(() => setHasCopied(false), 2000);
    };
    const currentPlayerIsHost = currentPlayer?.id === room?.hostId;
    const otherPlayer = players.find((p) => p.id !== currentPlayer?.id);

    const maxPlayers = 2;
    const emptySlots = maxPlayers - players.length;

    const handleStart = () => {
        if (!room) return;
        if (currentPlayer?.id !== room.hostId) return alert("Only the host can start the game");
        if (players.length < 2) return alert("At least 2 players are required");

        service.call(Events.START_GAME, { userId: currentPlayer.id, roomId: room.id });
    };
    const handleKickPlayer = (id: string) => {
        if (!currentPlayerIsHost || !currentPlayer || !room) return;
        service.call(Events.KICK_PLAYER, { userId: currentPlayer.id, roomId: room.id, kickTargetId: id });
    };
    const path = useLocation().pathname;

    return (
        visible && (
            <div
                className="relative flex flex-col gap-4 w-screen h-[100vh] bg-primary items-center justify-center p-2 md:p-4"
                style={{
                    backgroundImage: `url(/assets/game/play-background.png)`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            >
                {/* Main content */}
                <div className="w-full flex flex-col gap-4">
                    <div className="md:min-h-[25vh] min-h-[40vh]">
                        <div className="md:mt-20 flex-1 flex flex-col md:flex-row landscape:flex-row gap-3 md:gap-6 landscape:gap-4 items-center justify-center max-w-[calc(2*20rem+3.5rem+1.5rem)] mx-auto">
                            <div className="relative flex-1 flex flex-col items-center justify-center gap-2 md:gap-4 landscape:gap-2 bg-gradient-to-b from-dark/90 to-dark/70 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 landscape:p-4 border-2 border-accent/40 shadow-[0_8px_32px_rgba(16,185,129,0.2)] max-w-xs w-full">
                                {currentPlayerIsHost && (
                                    <div className="absolute -top-3 left-4 px-3 py-1 bg-accent/90 rounded-full">
                                        <span className="text-xs font-bold text-dark">Host</span>
                                    </div>
                                )}

                                <div className="relative">
                                    {lobbyState === "matchmaking" && (
                                        <>
                                            <div className="absolute inset-0 rounded-full bg-accent/30 animate-ping" />
                                            <div className="absolute inset-0 rounded-full bg-accent/20 animate-pulse" />
                                        </>
                                    )}
                                    <img
                                        src={currentPlayer?.photo || "/placeholder.svg"}
                                        className="relative w-20 h-20 md:w-36 md:h-36 landscape:w-24 landscape:h-24 rounded-full shadow-xl border-4 md:border-[6px] landscape:border-4 border-accent/60"
                                        alt="Player 1"
                                    />
                                </div>

                                <div className="text-center">
                                    <h2 className="text-lg md:text-2xl landscape:text-xl font-bold text-text">
                                        {currentPlayer?.name}
                                    </h2>
                                    <p className="text-xs md:text-sm text-accent/60 mt-1">Ready to play</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center flex-shrink-0 relative">
                                <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl" />
                                <div className="relative w-14 h-14 md:w-24 md:h-24 landscape:w-16 landscape:h-16 rounded-full bg-gradient-to-br from-accent via-accent/90 to-accent/70 flex items-center justify-center shadow-[0_8px_32px_rgba(16,185,129,0.4)] border-4 border-accent/30">
                                    <span className="text-xl md:text-4xl landscape:text-2xl font-black text-dark">VS</span>
                                </div>
                            </div>

                            <div className="relative flex-1 flex flex-col items-center justify-center gap-2 md:gap-4 landscape:gap-2 bg-gradient-to-b from-dark/90 to-dark/70 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 landscape:p-4 border-2 border-accent/40 shadow-[0_8px_32px_rgba(16,185,129,0.2)] max-w-xs w-full">
                                {!currentPlayerIsHost && (
                                    <div className="absolute -top-3 left-4 px-3 py-1 bg-accent/90 rounded-full">
                                        <span className="text-xs font-bold text-dark">Host</span>
                                    </div>
                                )}

                                {currentPlayerIsHost && otherPlayer && (
                                    <Button
                                        onClick={() => handleKickPlayer(otherPlayer?.id!)}
                                        variant="dark"
                                        className="absolute top-2 right-2 px-2! w-8! h-8! hover:bg-red-600 transition-colors"
                                    >
                                        ×
                                    </Button>
                                )}

                                <div className="relative">
                                    {lobbyState === "matchmaking" && (
                                        <>
                                            <div className="absolute inset-0 rounded-full bg-accent/30 animate-ping" />
                                            <div className="absolute inset-0 rounded-full bg-accent/20 animate-pulse" />
                                        </>
                                    )}

                                    {otherPlayer ? (
                                        <img
                                            src={otherPlayer?.photo || "/placeholder.svg"}
                                            className="relative w-20 h-20 md:w-36 md:h-36 landscape:w-24 landscape:h-24 rounded-full shadow-xl border-4 md:border-[6px] landscape:border-4 border-accent/60"
                                            alt="Player 2"
                                        />
                                    ) : (
                                        <div className="relative w-20 h-20 md:w-36 md:h-36 landscape:w-24 landscape:h-24 rounded-full border-4 md:border-[6px] landscape:border-4 border-dashed border-accent/50 shadow-xl flex items-center justify-center bg-dark/80">
                                            <span className="text-3xl md:text-5xl landscape:text-4xl text-accent/40">?</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-center">
                                    <h2 className="text-lg md:text-2xl landscape:text-xl font-bold text-text">
                                        {otherPlayer?.name ?? "Waiting..."}
                                    </h2>
                                    <p className="text-xs md:text-sm text-accent/60 mt-1">
                                        {otherPlayer
                                            ? "Ready to play"
                                            : lobbyState === "matchmaking"
                                            ? "Searching..."
                                            : "Empty slot"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-[calc(2*20rem+3.5rem+1.5rem)] mx-auto grid grid-cols-2 items-center justify-center gap-2">
                        <Button
                            variant="dark"
                            disabled={!currentPlayerIsHost || players.length >= 2}
                            onClick={() =>
                                lobbyState === "matchmaking" ? handleCancelMatchmaking() : handleStartMatchmaking()
                            }
                            className="  bg-dark/80 border-2 border-accent/40 hover:bg-dark hover:border-accent/60 transition-all"
                        >
                            {lobbyState === "matchmaking" ? (
                                <Loader className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <UsersIcon className="w-4 h-4 mr-2" />
                            )}
                            {lobbyState === "matchmaking" ? "Cancel Search" : "Find Online"}
                        </Button>

                        <Button
                            disabled={!currentPlayerIsHost || players.length < 2}
                            onClick={handleStart}
                            variant="dark"
                            className=" bg-dark/80 border border-accent/30 hover:bg-dark hover:border-accent/50 transition-all"
                        >
                            {currentPlayerIsHost ? "Start Game" : "Waiting for host..."}
                        </Button>
                        <Link to={"/"} className="w-full">
                            <Button
                                variant="dark"
                                className="w-full flex items-center justify-center gap-2 bg-dark/80 border border-accent/30 hover:bg-dark hover:border-accent/50 transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" /> Go Back
                            </Button>
                        </Link>
                        <Button
                            onClick={handleInvite}
                            variant="dark"
                            className="landscape:w-auto md:w-auto! px-3 md:px-4! bg-dark/80 border-2 border-accent/40 hover:bg-dark hover:border-accent/60 transition-all"
                        >
                            {hasCopied ? (
                                <CheckIcon className="w-4 h-4 text-green-400" />
                            ) : (
                                <ShareIcon className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        )
    );
}
