import { AnimatePresence, motion } from "framer-motion";
import React from "react";

interface PoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: PoolModalProps) {
    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    key="modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        className={`w-full max-w-[90vw] h-[70vh] md:h-[80vh] p-8 overflow-y-auto border-12 bg-primary border-dark mx-auto p-6 rounded-2xl shadow-2xl
                            ${className}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6">
                            <h2 className="font-bold text-accent text-4xl">{title}</h2>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-md flex items-center justify-center cursor-pointer transition-all hover:scale-110 bg-dark text-accent border-none text-xl"
                            >
                                ×
                            </button>
                        </div>
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
