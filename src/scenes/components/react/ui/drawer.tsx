import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import React, { useState } from "react";
import type { LocalUser } from "../../../../services/service";

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
    slideFrom?: "top" | "bottom";
}

export function Drawer({ me, isOpen, onClose, children, tabs, title, className, slideFrom = "top" }: DrawerProps) {
    const [activeTabId, setActiveTabId] = useState(tabs?.[0]?.id);

    const motionValue = slideFrom === "top" ? "-100%" : "100%";
    const positionClass = slideFrom === "top" ? "top-0" : "bottom-0";

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
                        initial={{ y: motionValue }}
                        animate={{ y: 0 }}
                        exit={{ y: motionValue }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={`fixed ${positionClass} left-0 right-0 z-50 bg-black/20 backdrop-blur-2xl shadow-lg border-accent/10 ${
                            slideFrom === "top" ? "border-b" : "border-t"
                        } ${className}`}
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
                            <div className="grid grid-cols-3 px-6 pt-6">
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

// Helper component for cleaner header
function CurrencyBadge({ icon, amount, color }: { icon: string; amount: number; color: string }) {
    return (
        <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
            <Plus size={16} className={color} />
            <div className="text-2xl">{icon}</div>
            <span className={`${color} font-bold`}>{amount}</span>
        </div>
    );
}
