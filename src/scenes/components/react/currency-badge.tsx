import { Plus } from "lucide-react";

export function CurrencyBadge({ icon, amount, color }: { icon: string; amount: number; color: string }) {
    return (
        <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
            <Plus size={16} className={color} />
            <div className="text-2xl">{icon}</div>
            <span className={`${color} font-bold`}>{amount}</span>
        </div>
    );
}
