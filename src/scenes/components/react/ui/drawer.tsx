import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import React, { useState } from "react";
import type { LocalUser } from "../../../../services/service";
import { CurrencyBadge } from "../currency-badge";

export interface Tab {
    id: string;
    label: string;
    disabled?: boolean;
    content: React.ReactNode;
}

interface DrawerProps {
    me: LocalUser;
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode; // Now optional if using tabs
    tabs?: Tab[];
    title?: string;
    className?: string;
    slideFrom?: "top" | "bottom" | "left" | "right";
}

export function Drawer({ me, isOpen, onClose, children, tabs, title, className, slideFrom = "top" }: DrawerProps) {
    const [activeTabId, setActiveTabId] = useState(tabs?.[0]?.id);

    const isHorizontal = slideFrom === "left" || slideFrom === "right";
    const motionValue = slideFrom === "top" || slideFrom === "left" ? "-100%" : "100%";

    const positionClasses = {
        top: "top-0 left-0 right-0 border-b",
        bottom: "bottom-0 left-0 right-0 border-t",
        left: "left-0 top-0 bottom-0 border-r w-80",
        right: "right-0 top-0 bottom-0 border-l w-80",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-3xl z-40"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={isHorizontal ? { x: motionValue } : { y: motionValue }}
                        animate={isHorizontal ? { x: 0 } : { y: 0 }}
                        exit={isHorizontal ? { x: motionValue } : { y: motionValue }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={`fixed z-50 bg-black/20 backdrop-blur-2xl shadow-lg border-accent/10 ${positionClasses[slideFrom]} ${className}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-accent/10">
                            {title && <h2 className="text-accent text-2xl font-bold">{title}</h2>}
                            <div className="flex flex-row gap-3 px-2">
                                <CurrencyBadge icon="💵" amount={me.cash} color="text-green-400" />
                                <CurrencyBadge icon="🪙" amount={me.coins} color="text-yellow-400" />
                                <button
                                    onClick={onClose}
                                    className="bg-accent/10 hover:bg-accent/20 rounded-lg p-2 transition-colors"
                                >
                                    <X className="w-6 h-6 text-accent" />
                                </button>
                            </div>
                        </div>

                        {tabs && (
                            <div
                                className="grid px-6 pt-6"
                                style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
                            >
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTabId(tab.id)}
                                        disabled={tab.disabled}
                                        className={`py-3 px-6 font-semibold text-lg transition-all ${
                                            activeTabId === tab.id
                                                ? "bg-accent/20 text-accent border-2 border-accent"
                                                : "bg-white/5 text-white/60 border-2 border-white/10 hover:bg-accent/10"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
                            {tabs ? tabs.find((t) => t.id === activeTabId)?.content : children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
