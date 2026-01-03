import React from "react";
import { COLORS } from "../../../common/pool-constants.ts";
import { Events } from "../../../common/server-types";
import type { Room } from "../../../server";
import type { MultiplayerService } from "../../../services/multiplayer-service.tsx";
import { Button } from "./button.tsx";
import { SettingsModal } from "./settings-modal.tsx";

type GameSettings = {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    selectedCueIndex: number;
};

export function PoolLobby({ service }: { service: MultiplayerService }) {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());

    const [visable, setVisable] = React.useState(true);
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    React.useEffect(() => {
        service.listen(Events.JOIN_ROOM_RESPONSE, (input) => {
            setVisable(true);
            const { type } = input;
            const roomIdFromUrl = service.getRoomId();
            console.log("Room ID from URL", roomIdFromUrl);
            if (type === "error") {
                const { code: errCode, message: errMessage } = input;
                return console.error("Error joining room", errCode, errMessage);
            }

            const room = input.data;
            service.instanciateRoom(room);
            setRoom(room);

            if (roomIdFromUrl !== room.id) {
                // redirect to room
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set("room", room.id);
                window.history.replaceState({}, "", newUrl.toString());
            }
        });

        service.listen(Events.INIT, (input) => setVisable(false));
    }, [service]);

    const handleInvite = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Invite link copied to clipboard!");
    };

    const players = room?.players ?? [];
    const currentPlayer = service.me();
    const currentPlayerIsHost = currentPlayer?.userId === room?.hostId;

    const maxPlayers = 2;
    const emptySlots = maxPlayers - players.length;

    const handleStart = () => {
        if (!room) return;
        if (currentPlayer?.userId !== room.hostId) return alert("Only the host can start the game");
        if (players.length < 2) return alert("At least 2 players are required");

        service.call(Events.START_GAME, { userId: currentPlayer.userId, roomId: room.id });
    };

    return (
        visable && (
            <div
                style={{
                    width: "100%",
                    maxWidth: "56rem",
                    margin: "0 auto",
                    padding: "1.5rem",
                    borderRadius: "1rem",
                    backgroundColor: COLORS.dark,
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                }}
            >
                <div
                    style={{
                        borderRadius: "0.75rem",
                        padding: "2rem",
                        backgroundColor: COLORS.primary,
                        border: `3px solid ${COLORS.dark}`,
                        position: "relative",
                    }}
                >
                    <button
                        onClick={() => setSettingsOpen(true)}
                        style={{
                            position: "absolute",
                            top: "1rem",
                            right: "1rem",
                            width: "2.5rem",
                            height: "2.5rem",
                            borderRadius: "0.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "transform 0.2s",
                            backgroundColor: COLORS.dark,
                            color: COLORS.text,
                            border: `2px solid ${COLORS.dark}`,
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                            fontSize: "1.25rem",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        title="Settings"
                    >
                        ⚙️
                    </button>

                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                        <h1
                            style={{
                                fontSize: "2.25rem",
                                fontWeight: "bold",
                                marginBottom: "0.5rem",
                                color: COLORS.text,
                            }}
                        >
                            Pool Game Lobby
                        </h1>
                        <p style={{ fontSize: "1.125rem", color: COLORS.accent }}>Set up your game and invite players</p>
                    </div>

                    {/* Host Setup */}
                    <div
                        style={{
                            marginBottom: "2rem",
                            padding: "1.5rem",
                            borderRadius: "0.5rem",
                            backgroundColor: `${COLORS.dark}30`,
                            border: `2px solid ${COLORS.dark}`,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: "1.5rem",
                                flexWrap: "wrap",
                            }}
                        >
                            {/* Host Avatar */}
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                }}
                            >
                                <div
                                    style={{
                                        width: "5rem",
                                        height: "5rem",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "1.5rem",
                                        fontWeight: "bold",
                                        backgroundColor: COLORS.dark,
                                        color: COLORS.accent,
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                                    }}
                                >
                                    {currentPlayer?.name.charAt(0).toUpperCase() || "H"}
                                </div>
                            </div>

                            {/* Name Input */}
                            <div style={{ flex: "1", minWidth: "200px" }}>
                                <label
                                    htmlFor="host-name"
                                    style={{
                                        display: "block",
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
                                        marginBottom: "0.5rem",
                                        color: COLORS.accent,
                                    }}
                                >
                                    Your Name
                                </label>
                                <input
                                    id="host-name"
                                    type="text"
                                    placeholder="Enter your name"
                                    defaultValue={currentPlayer?.name}
                                    style={{
                                        width: "90%",
                                        padding: "0.75rem 1rem",
                                        borderRadius: "0.5rem",
                                        fontSize: "1.125rem",
                                        fontWeight: "500",
                                        outline: "none",
                                        backgroundColor: COLORS.dark,
                                        color: COLORS.text,
                                        border: `2px solid ${COLORS.dark}`,
                                        boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Players Grid */}
                    <div style={{ marginBottom: "2rem" }}>
                        <h2
                            style={{
                                fontSize: "1.25rem",
                                fontWeight: "600",
                                marginBottom: "1rem",
                                textAlign: "center",
                                color: COLORS.text,
                            }}
                        >
                            Players ({players.length}/{maxPlayers})
                        </h2>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                height: "100%",
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, minmax(100px, 1fr))",
                                    gap: "1rem",
                                }}
                            >
                                {/* Existing Players */}
                                {players.map((player) => (
                                    <div
                                        key={player.id}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            padding: "0.75rem",
                                            borderRadius: "0.5rem",
                                            backgroundColor: `${COLORS.dark}40`,
                                            border: `2px solid ${COLORS.dark}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "3rem",
                                                height: "3rem",
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "0.875rem",
                                                fontWeight: "bold",
                                                backgroundColor: COLORS.dark,
                                                color: COLORS.primary,
                                            }}
                                        >
                                            {player.name}
                                        </div>
                                        <span
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: "500",
                                                textAlign: "center",
                                                color: `${COLORS.text}90`,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                width: "100%",
                                            }}
                                        >
                                            {player.name}
                                        </span>
                                    </div>
                                ))}

                                {/* Empty Slots */}
                                {Array.from({ length: emptySlots }).map((_, index) => (
                                    <div
                                        key={`empty-${index}`}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            padding: "0.75rem",
                                            borderRadius: "0.5rem",
                                            border: `2px dashed ${COLORS.dark}80`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "3rem",
                                                height: "3rem",
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: `${COLORS.dark}60`,
                                                border: `2px dashed ${COLORS.dark}60`,
                                            }}
                                        >
                                            <span style={{ fontSize: "1.5rem", color: `${COLORS.text}60` }}>?</span>
                                        </div>
                                        <span style={{ fontSize: "0.75rem", color: `${COLORS.text}60` }}>Waiting...</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        <Button onClick={handleInvite} variant="primary" style={{ flex: "1", minWidth: "200px" }}>
                            Copy Invite Link
                        </Button>
                        <Button
                            onClick={handleStart}
                            disabled={!currentPlayerIsHost}
                            variant="dark"
                            style={{ flex: "1", minWidth: "200px" }}
                        >
                            Start Game
                        </Button>
                    </div>
                </div>

                <SettingsModal
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    settings={service.getSettings()}
                    onSave={(data) => service.setSettings(data)}
                />
            </div>
        )
    );
}
