"use client";

import React from "react";

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "dark" | "destructive";
    disabled?: boolean;
    className?: string;
}

export function Button({ children, onClick, variant = "primary", disabled = false, className = "" }: ButtonProps) {
    const baseClasses =
        " flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base cursor-pointer transition-transform border-2 border-[#1A1A1A] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-100";

    const variantClasses = {
        primary:
            "backdrop-blur-md bg-black/40! hover:bg-emerald-600/30 border-emerald-500/30 hover:border-emerald-400/50 text-emerald-300",
        secondary: "bg-[#1A1A1A] text-white",
        dark: "bg-[#1A1A1A] text-emerald-300 hover:bg-[#1A1A1A]/80 border-[#1A1A1A]",
        destructive: "bg-red-600/90 text-white hover:bg-red-600/70",
    };

    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {children}
        </button>
    );
}
