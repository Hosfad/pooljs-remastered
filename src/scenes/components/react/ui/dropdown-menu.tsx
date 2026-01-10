import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface DropdownMenuItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface ReusableDropdownProps {
    isOpen?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    trigger: React.ReactNode;
    items: DropdownMenuItem[];
    preferredPosition?: "above" | "below";
    align?: "left" | "right";
    className?: string;
}

export const DropdownMenuTrigger = ({
    isOpen,
    setOpen,
    children,
}: {
    isOpen: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={`
                        flex items-center gap-3 px-6 py-3 
                        bg-dark border border-white/10 backdrop-blur-md
                        transition-all duration-200 group-hover:border-emerald-500/50
                        ${isOpen ? "border-emerald-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : ""}
                    `}
        >
            {children ? (
                <>{children}</>
            ) : (
                <ChevronDown
                    onClick={() => setOpen(!isOpen)}
                    className={`w-4 h-4 text-white/50 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                />
            )}

            <div
                className={`
                            absolute bottom-0 left-0 h-[2px] bg-emerald-400 transition-all duration-300
                            ${isOpen ? "w-full shadow-[0_0_10px_#22d3ee]" : "w-0 group-hover:w-1/2"}
                        `}
            />
        </div>
    );
};

export default function DropdownMenu({
    isOpen: isOpenProp,
    setOpen: setOpenProp,
    trigger,
    items,
    preferredPosition = "below",
    align = "left",
    className,
}: ReusableDropdownProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(isOpenProp);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
        setOpenProp?.(!isOpen);
    };
    const closeMenu = () => {
        setIsOpen(false);
        setOpenProp?.(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                closeMenu();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const verticalClass = preferredPosition === "above" ? "bottom-full mb-2" : "top-full mt-2";
    const alignmentClass = align === "right" ? "right-0" : "left-0";

    const menuVariants = {
        hidden: {
            opacity: 0,
            scale: 0.95,
            y: preferredPosition === "above" ? 10 : -10,
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: "spring",
                bounce: 0.3,
                duration: 0.4,
                staggerChildren: 0.05,
            },
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.2 },
        },
    } as const;

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
            <div onClick={toggleMenu} className="inline-block cursor-pointer">
                {trigger}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={menuVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{
                            transformOrigin: `${align} ${preferredPosition === "above" ? "bottom" : "top"}`,
                        }}
                        className={`
                            absolute z-50 flex flex-col gap-[2px] min-w-[220px] max-w-[90vw]
                            bg-dark backdrop-blur-xl border border-white/10
                            shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden rounded-sm
                            ${verticalClass} ${alignmentClass}
                        `}
                    >
                        {items.map((item) => (
                            <motion.button
                                dir={align === "right" ? "rtl" : "ltr"}
                                key={item.id}
                                whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    item.onClick();
                                    closeMenu();
                                }}
                                className={`
                                    group relative flex items-center w-full px-5 py-4 gap-4
                                    border-l-2 border-transparent transition-colors duration-200 text-emerald-400
                                    ${item.danger ? "hover:text-red-400" : ""}
                                `}
                            >
                                <div
                                    className={`absolute left-0 top-0 bottom-0 w-[2px] scale-y-0 group-hover:scale-y-100 transition-transform duration-200
                                    ${
                                        item.danger
                                            ? "bg-red-500 shadow-[0_0_15px_#ef4444]"
                                            : "bg-emerald-400 shadow-[0_0_15px_#22d3ee]"
                                    }
                                `}
                                />

                                {item.icon && (
                                    <span className="shrink-0 opacity-70 group-hover:opacity-100 transition-all">
                                        {item.icon}
                                    </span>
                                )}
                                <span className="text-white font-bold italic tracking-tight text-base uppercase group-hover:translate-x-1 transition-transform whitespace-nowrap">
                                    {item.label}
                                </span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
