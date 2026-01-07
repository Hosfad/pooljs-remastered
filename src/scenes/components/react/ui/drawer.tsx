import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import React from "react";
import type { LocalUser } from "../../../../services/service";
interface DrawerProps {
    me: LocalUser;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    className?: string;
}

export function Drawer({ me, isOpen, onClose, children, title, className }: DrawerProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-3xl z-40 max-h-screen"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: "-100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "-100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={`fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-2xl shadow-lg ${className}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-accent/10">
                            {title && <h2 className="text-accent text-2xl font-bold">{title}</h2>}

                            <div className="flex flex-row gap-3 px-2">
                                <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
                                    <Plus size={16} className="text-green-400" />

                                    <div className="text-2xl">💵</div>
                                    <span className="text-green-400 font-bold">{me.cash}</span>
                                </div>

                                <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
                                    <Plus size={16} className="text-yellow-400" />
                                    <div className="text-2xl">🪙</div>
                                    <span className="text-yellow-400 font-bold">{me.coins}</span>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="ml-auto bg-accent/10  hover:bg-accent/20 rounded-lg p-2 transition-colors"
                                >
                                    <X className="w-6 h-6 text-accent" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">{children}</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
