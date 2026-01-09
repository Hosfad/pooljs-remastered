import React from "react";
import { COLORS } from "../../../../common/pool-constants.ts";

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
        <div className="mb-6">
            <div className="flex items-center gap-4 flex-wrap">
                <span className="text-white font-bold text-lg min-w-[140px] sm:min-w-[180px]">{label}</span>

                <div className="relative flex-1 min-w-[150px] sm:min-w-[200px]">
                    <div className="w-full h-8 sm:h-9 bg-acceny/30 border-2 border-accent rounded-lg relative overflow-hidden">
                        <div
                            className="h-full bg-accent transition-[width] duration-200"
                            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
                        />
                    </div>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="absolute top-0 left-0 w-full h-8 sm:h-9 opacity-0 cursor-pointer"
                    />
                </div>
                {showValue && (
                    <span className="text-accent text-base sm:text-lg min-w-[50px] sm:min-w-[60px] text-right font-medium">
                        {value}
                        {valueSuffix}
                    </span>
                )}
            </div>
        </div>
    );
}
