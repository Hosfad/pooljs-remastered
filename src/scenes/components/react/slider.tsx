// Slider.tsx
import React from "react";
import { COLORS } from "../../../common/pool-constants.ts";

interface SliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    backgroundColor?: string;
    borderColor?: string;
    fillColor?: string;
    textColor?: string;
    showValue?: boolean;
    valueSuffix?: string;
}

export function Slider({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    backgroundColor,
    borderColor = COLORS.accent,
    fillColor = COLORS.accent,
    textColor = COLORS.text,
    showValue = true,
    valueSuffix = "%",
}: SliderProps) {
    const background = backgroundColor || `${COLORS.primary}30`;
    const [_] = React.useState();

    return (
        <div style={{ marginBottom: "1.5rem" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                }}
            >
                <label
                    style={{
                        color: textColor,
                        fontSize: "1.125rem",
                        minWidth: "160px",
                        fontWeight: "500",
                    }}
                >
                    {label}
                </label>
                <div
                    style={{
                        position: "relative",
                        flex: 1,
                        minWidth: "200px",
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            height: "36px",
                            backgroundColor: background,
                            border: `2px solid ${borderColor}`,
                            borderRadius: "0.5rem",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: `${((value - min) / (max - min)) * 100}%`,
                                height: "100%",
                                backgroundColor: fillColor,
                                transition: "width 0.2s",
                            }}
                        />
                    </div>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "36px",
                            opacity: 0,
                            cursor: "pointer",
                        }}
                    />
                </div>
                {showValue && (
                    <span
                        style={{
                            color: textColor,
                            fontSize: "1.125rem",
                            minWidth: "60px",
                            textAlign: "right",
                            fontWeight: "500",
                        }}
                    >
                        {value}
                        {valueSuffix}
                    </span>
                )}
            </div>
        </div>
    );
}
