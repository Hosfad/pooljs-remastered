"use client";

import React from "react";
import { COLORS } from "../../../common/pool-constants";

interface PoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: PoolModalProps) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: "0",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
                zIndex: 50,
            }}
            onClick={onClose}
        >
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
                    {/* Header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "1.5rem",
                        }}
                    >
                        <h2
                            style={{
                                fontSize: "1rem",
                                fontWeight: "bold",
                                color: COLORS.dark,
                            }}
                        >
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            style={{
                                width: "2rem",
                                height: "2rem",
                                borderRadius: "0.375rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "transform 0.2s, background-color 0.2s",
                                backgroundColor: COLORS.dark,
                                color: COLORS.text,
                                border: "none",
                                fontSize: "1.25rem",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.1)";
                                e.currentTarget.style.backgroundColor = `${COLORS.dark}dd`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.backgroundColor = COLORS.dark;
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Content */}
                    <div
                        style={{
                            padding: "1.5rem",
                        }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
