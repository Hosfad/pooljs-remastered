interface RadioGroupProps<T extends string> {
    label: string;
    options: { label: string; value: T }[];
    selectedValue: T;
    onChange: (value: T) => void;
}

export function RadioGroup<T extends string>({ label, options, selectedValue, onChange }: RadioGroupProps<T>) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-white font-bold text-lg">{label}</span>
            <div className="flex bg-white/10 p-1 rounded-md border border-white/10 shadow-inner">
                {options.map((option) => {
                    const isActive = selectedValue === option.value;
                    return (
                        <button
                            key={option.value}
                            onClick={() => onChange(option.value)}
                            className={`
                                px-6 py-1.5 text-sm font-bold transition-all duration-200 rounded-[4px]
                                ${
                                    isActive
                                        ? "bg-gradient-to-b from-accent/50 to-accent/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] "
                                        : "text-white/60 hover:text-white"
                                }
                            `}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
