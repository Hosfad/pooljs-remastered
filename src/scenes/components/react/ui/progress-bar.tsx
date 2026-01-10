interface StatProgressBarProps {
    label: string;
    currentValue: number | string;
    maxValue: number | string;
    percentage: number;
    icon?: string;
    tooltipData?: Record<string, string>;
}

export function StatProgressBar({ label, currentValue, maxValue, percentage, icon, tooltipData }: StatProgressBarProps) {
    return (
        <div className="flex-1 p-4 rounded-md bg-accent/10 border border-white/10 group relative">
            <p className="text-xs italic text-white mb-1">{label}</p>

            <div className="relative h-7 bg-accent/20 rounded-sm overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center z-10 text-xs italic font-bold text-white">
                    {currentValue}/{maxValue}
                </div>

                {icon && <div className="absolute right-2 top-1 text-orange-500 text-sm z-10">{icon}</div>}

                <div
                    className="h-full bg-gradient-to-r from-lime-400 to-green-600 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {tooltipData && Object.keys(tooltipData).length > 0 && (
                <div className="absolute bottom-full left-1/2 translate-y-1/2 mb-2 hidden group-hover:block z-50">
                    <div className="bg-dark text-white text-[10px] rounded p-2 shadow-xl whitespace-nowrap min-w-[120px]">
                        {Object.entries(tooltipData).map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-4">
                                <span className="opacity-70">{key}:</span>
                                <span className="font-mono text-accent">{value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="w-2 h-2 bg-dark border-r  rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                </div>
            )}
        </div>
    );
}
