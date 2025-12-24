
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { History, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FilterHistoryProps {
    table: string;
    currentFilter: string;
    onSelectFilter: (filter: string) => void;
}

const STORAGE_KEY = 'runedb_filter_history';
const MAX_HISTORY = 10;

export function FilterHistory({ table, currentFilter, onSelectFilter }: FilterHistoryProps) {
    const { t } = useTranslation();
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        loadHistory();
    }, [table]);

    // Save history whenever currentFilter changes (debounced by parent or here?)
    // Actually, parent should call a save method or we expose one?
    // Better: We expose a save function or use an effect here if currentFilter is "valid" and "final".
    // But currentFilter changes on every keystroke in some cases.
    // Let's rely on an explicit "Save" or just save when unique and non-empty after a delay?
    // Or better: The parent calls a save when "Applied".
    // For now, let's load logic. Saving might be better handled by DataEditor invoking a util, but a component is fine if we use a prop "triggerSave".
    // Let's just provide a "Save Current" button in the menu? Or auto-save?
    // Auto-save on unmount or when filter is cleared/changed significantly?
    // Let's keep it simple: Load history. Saving is done via `saveToHistory` helper exported or internal effect?
    // Let's make this component responsible for ONLY Displaying history.
    // The DataEditor will pass `onSelectFilter`.
    // But how do we write to history?
    // Maybe we export a helper function `addToHistory(table, filter)` from here?

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/70 hover:text-primary">
                    <History size={14} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">{t('filterHistory.title')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {history.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center italic">{t('filterHistory.noHistory')}</div>
                ) : (
                    history.map((filter, idx) => (
                        <DropdownMenuItem
                            key={idx}
                            onClick={() => onSelectFilter(filter)}
                            className="text-xs truncate font-mono cursor-pointer"
                            title={filter}
                        >
                            <Clock size={12} className="mr-2 opacity-50 flex-shrink-0" />
                            <span className="truncate">{filter}</span>
                        </DropdownMenuItem>
                    ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-[10px] text-destructive focus:text-destructive"
                    onClick={() => {
                        clearHistory(table, setHistory);
                        toast.success(t('filterHistory.cleared'));
                    }}
                >
                    <Trash2 size={12} className="mr-2" />
                    {t('filterHistory.clear')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    function loadHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const allHistory = JSON.parse(raw);
            const tableHistory = allHistory[table] || [];
            setHistory(tableHistory);
        } catch (e) {
            console.error("Failed to load filter history", e);
        }
    }
}

// Helper to save history
export function addToHistory(table: string, filter: string) {
    if (!filter) return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        let allHistory = raw ? JSON.parse(raw) : {};
        let tableHistory = allHistory[table] || [];

        // Remove if exists (to move to top)
        tableHistory = tableHistory.filter((f: string) => f !== filter);
        // Add to top
        tableHistory.unshift(filter);
        // Limit
        tableHistory = tableHistory.slice(0, MAX_HISTORY);

        allHistory[table] = tableHistory;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
    } catch (e) {
        console.error("Failed to save filter history", e);
    }
}

function clearHistory(table: string, setHistory: (h: string[]) => void) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        let allHistory = raw ? JSON.parse(raw) : {};
        delete allHistory[table];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
        setHistory([]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
        setHistory([]);
        // toast.success("History cleared"); // moved to component
    } catch (e) {
        console.error("Failed to clear history", e);
    }
}
