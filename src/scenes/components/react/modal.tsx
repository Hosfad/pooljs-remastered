import React from "react";

interface PoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: PoolModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                }}
                className="w-full max-w-[90vw] h-[70vh] md:h-[80vh] p-8 overflow-y-auto  border-12 bg-primary border-dark mx-auto p-6 rounded-2xl shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6">
                    <h2 className=" font-bold text-accent text-4xl">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-md flex items-center justify-center cursor-pointer transition-all hover:scale-110 bg-dark text-accent border-none text-xl"
                    >
                        ×
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
