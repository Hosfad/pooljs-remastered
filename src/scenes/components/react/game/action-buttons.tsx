import { LogOut, MessagesSquareIcon, Settings, X } from "lucide-react";
import { useState } from "react";
import { Events } from "../../../../common/server-types";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import DropdownMenu, { DropdownMenuTrigger } from "../ui/dropdown-menu";

const QUICK_MESSAGES = [
    "Good Luck",
    "Nice shot",
    "Well played",
    "You're good!",
    "Thanks",
    "Oops",
    "Unlucky",
    "Nice try",
    "Hehe",
    "Close!",
    "Good Game",
];

export default function ActionButtons({ service, position }: { service: MultiplayerService; position: "left" | "right" }) {
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [messagesOpen, setMessagesOpen] = useState<boolean>(false);

    const triggerPosition = position === "left" ? "left-6" : "right-6";
    const me = service.me();

    return (
        <div className="relative w-full ">
            <div className={`fixed flex flex-col gap-2 z-50 top-6 ${triggerPosition}`}>
                <DropdownMenu
                    isOpen={menuOpen}
                    setOpen={setMenuOpen}
                    align={position}
                    trigger={<DropdownMenuTrigger setOpen={setMenuOpen} isOpen={menuOpen}></DropdownMenuTrigger>}
                    items={[
                        { id: "1", label: "Close", icon: <X />, onClick: () => {} },
                        { id: "2", label: "Settings", icon: <Settings />, onClick: () => {} },
                        { id: "3", label: "Leave", icon: <LogOut />, onClick: () => {}, danger: true },
                    ]}
                />
                <DropdownMenu
                    isOpen={messagesOpen}
                    setOpen={setMessagesOpen}
                    align={position}
                    trigger={
                        <DropdownMenuTrigger setOpen={setMessagesOpen} isOpen={messagesOpen}>
                            <MessagesSquareIcon className="w-4 h-4 text-white/50 transition-transform duration-300" />
                        </DropdownMenuTrigger>
                    }
                    items={QUICK_MESSAGES.map((msg, idx) => ({
                        id: idx.toString(),
                        label: msg,
                        onClick: () => {
                            service.call(Events.CHAT_MESSAGE, { message: msg, from: me.id });
                        },
                    }))}
                />
            </div>
        </div>
    );
}
