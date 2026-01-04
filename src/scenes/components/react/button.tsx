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
        primary: "bg-[#2C5530]/30 text-white",
        secondary: "bg-[#1A1A1A] text-white",
        dark: "bg-[#1A1A1A] text-[#92cf04ff] hover:bg-[#1A1A1A]/80",
        destructive: "bg-red-600/90 text-white hover:bg-red-600/70",
    };

    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {children}
        </button>
    );
}
