import React from "react";
import { Events } from "../../../../common/server-types";
import type { Room } from "../../../../server";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import BallRail from "./ball-rail";
import { GameInfoWidget } from "./game-info-widget";
import PowerMeter from "./power-meter";
import SpinIndicator from "./spin-selector";

function GameLayout({ visible, service }: { visible: boolean; service: MultiplayerService }) {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());
    const [settings, setSettings] = React.useState(service.getSettings());

    React.useEffect(() => {
        service.subscribe(Events.INIT, (data) => {
            setRoom(data);
            setSettings(service.getSettings());
        });
        service.subscribe(Events.UPDATE_ROOM, (data) => {
            setRoom(data);
            setSettings(service.getSettings());
        });
    }, [service]);

    return (
        visible && (
            <>
                <PowerMeter service={service} position={settings.powerMeterPosition} />
                <BallRail position={settings.powerMeterPosition === "left" ? "right" : "left"} />
                <GameInfoWidget room={room!} service={service} />
                <SpinIndicator room={room!} service={service} position={settings.spinSelectorPosition} />
            </>
        )
    );
}

export default GameLayout;
