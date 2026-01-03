import React from "react";
import { COLORS } from "../../../common/pool-constants";

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "dark" | "destructive";
    disabled?: boolean;
    style?: React.CSSProperties;
}

export function Button({ children, onClick, variant = "primary", disabled = false, style = {} }: ButtonProps) {
    const variants = {
        primary: {
            backgroundColor: `${COLORS.primary}30`,
            color: COLORS.text,
        },
        secondary: {
            backgroundColor: COLORS.dark,
            color: COLORS.text,
        },
        dark: {
            backgroundColor: COLORS.dark,
            color: COLORS.accent,
            hover: {
                backgroundColor: `${COLORS.dark}80`,
            },
        },
        destructive: {
            backgroundColor: "#dc262690",
            color: "#ffffff",
            hover: {
                backgroundColor: "#dc262670",
            },
        },
    };
    const variantStyles = variants[variant as keyof typeof variants] ?? variants.primary;

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                fontWeight: "600",
                fontSize: "1rem",
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "transform 0.2s",
                border: `2px solid ${COLORS.dark}`,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                opacity: disabled ? "0.5" : "1",
                ...variantStyles,
                ...style,
            }}
            onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.transform = "scale(1.05)";
                const hover = variants[variant as keyof typeof variants];
                //@ts-ignore
                if (hover.hover) {
                    //@ts-ignore
                    e.currentTarget.style.backgroundColor = hover.hover.backgroundColor;
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                const { backgroundColor } = variants[variant as keyof typeof variants];
                e.currentTarget.style.backgroundColor = backgroundColor;
            }}
        >
            {children}
        </button>
    );
}
