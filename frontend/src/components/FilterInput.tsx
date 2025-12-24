
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    ListFilter,
    Equal,
    ChevronRight,
    ChevronLeft,
    Search,
    AlignLeft,
    Check,
    Loader2
} from "lucide-react";
import { GetDistinctValues } from "../../wailsjs/go/main/App";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FilterInputProps {
    database: string;
    table: string;
    colName: string;
    value: string;
    onChange: (val: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    className?: string;
}

const OPERATORS = [
    { label: "Contains", value: "LIKE", icon: Search },
    { label: "Equals", value: "=", icon: Equal },
    { label: "Not Equals", value: "!=", icon: ListFilter }, // placeholder icon
    { label: "Greater Than", value: ">", icon: ChevronRight },
    { label: "Less Than", value: "<", icon: ChevronLeft },
    { label: "Starts With", value: "START", icon: AlignLeft },
];

export function FilterInput({ database, table, colName, value, onChange, onKeyDown, className }: FilterInputProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Parse current operator from value if possible
    // Default is usually LIKE (contains) if no prefix, or = if number? 
    // Logic: If value starts with =, >, <, != we treat it as operator
    // But for now, we just let user type or select.
    // If user selects "=", we prepend "=". 

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            const vals = await GetDistinctValues(database, table, colName);
            setSuggestions(vals || []);
        } catch (err) {
            console.error("Failed to fetch distinct values:", err);
            toast.error("Could not fetch suggestions");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOperator = (opValue: string) => {
        // Replace existing operator or prepend
        // Simple heuristic: remove known operators then prepend new one
        let cleanVal = value;
        for (const op of OPERATORS) {
            if (cleanVal.startsWith(op.value)) {
                cleanVal = cleanVal.substring(op.value.length);
                break;
            }
        }
        onChange(`${opValue}${cleanVal}`);
    };

    const handleSelectSuggestion = (val: string) => {
        // If val is "NULL", maybe treat differently?
        // standard SQL: = 'value'
        onChange(`=${val}`);
        setOpen(false);
        // We might want to trigger enter press logic too, but onChange should update state
    };

    const currentOp = OPERATORS.find(op => value.startsWith(op.value)) || OPERATORS[0]; // Default to first (LIKE/Contains) or whatever logic

    return (
        <div className={cn("relative flex items-center group/input", className)}>
            {/* Operator Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary p-0 z-10"
                    >
                        <currentOp.icon size={10} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                    {OPERATORS.map((op) => (
                        <DropdownMenuItem key={op.value} onClick={() => handleSelectOperator(op.value)} className="text-[10px] gap-2">
                            <op.icon size={12} className="text-muted-foreground" />
                            <span>{op.label}</span>
                            {op.value === currentOp.value && <Check size={10} className="ml-auto" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                className="h-7 text-xs pl-7 pr-7 border-none bg-transparent focus-visible:ring-0 focus-visible:bg-accent/10 placeholder:text-muted-foreground/30"
                placeholder="..."
            />

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-primary opacity-0 group-hover/input:opacity-100 transition-all p-0"
                        onClick={fetchSuggestions}
                    >
                        <ListFilter size={10} />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-48" align="start" side="bottom">
                    <Command className="w-full">
                        <CommandInput placeholder={`Search ${colName}...`} className="h-8 text-xs" />
                        <CommandList>
                            <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 size={12} className="animate-spin" /> Loading...
                                    </div>
                                ) : "No values found."}
                            </CommandEmpty>
                            <CommandGroup heading="Distinct Values" className="max-h-48 overflow-y-auto">
                                {!loading && suggestions.map((s, idx) => (
                                    <CommandItem
                                        key={idx}
                                        value={s}
                                        onSelect={() => handleSelectSuggestion(s)}
                                        className="text-xs truncate cursor-pointer"
                                    >
                                        <div className="flex items-center w-full">
                                            <span className="truncate flex-1">{s}</span>
                                            {value === `=${s}` && <Check size={10} className="ml-auto" />}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
