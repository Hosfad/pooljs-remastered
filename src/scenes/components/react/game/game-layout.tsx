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

    React.useEffect(() => {
        service.subscribe(Events.INIT, (data) => {
            setRoom(data);
        });
        service.subscribe(Events.UPDATE_ROOM, (data) => {
            setRoom(data);
        });
    }, [service]);

    return (
        visible && (
            <>
                <PowerMeter service={service} />
                <BallRail service={service} />
                <GameInfoWidget room={room!} service={service} />
                <SpinIndicator service={service} />
            </>
        )
    );
}

export default GameLayout;
