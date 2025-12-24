import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnInfo, TableAlteration } from '../types';
import {
    X,
    Plus,
    Trash2,
    Save,
    Settings2,
    AlertTriangle,
    GripVertical,
    Type,
    ShieldCheck,
    Hash,
    Key
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
    database: string;
    table: string;
    columns: ColumnInfo[];
    onSave: (alteration: TableAlteration) => Promise<boolean>;
    onClose: () => void;
    loading: boolean;
}

interface ColumnState extends ColumnInfo {
    isNew?: boolean;
    isDeleted?: boolean;
    isModified?: boolean;
    oldName?: string;
}

const typeGroups: Record<string, string[]> = {
    Numeric: ['int', 'tinyint', 'smallint', 'bigint', 'decimal(10,2)', 'float', 'double'],
    String: ['varchar(255)', 'char(1)', 'text', 'mediumtext', 'longtext', 'json'],
    Date: ['datetime', 'timestamp', 'date', 'time'],
    Other: ['boolean', 'blob', 'enum']
};

const allGroupedTypes = Object.values(typeGroups).reduce((acc, val) => acc.concat(val), [] as string[]);

export function ModifyTableModal({ database, table, columns, onSave, onClose, loading }: Props) {
    const { t } = useTranslation();
    const [columnStates, setColumnStates] = useState<ColumnState[]>([]);

    useEffect(() => {
        setColumnStates(columns.map(c => ({ ...c, oldName: c.name })));
    }, [columns]);

    const addColumn = () => {
        setColumnStates([...columnStates, {
            name: `new_column_${columnStates.length + 1}`,
            type: 'varchar(255)',
            nullable: true,
            key: '',
            default: '',
            extra: '',
            isNew: true
        }]);
    };

    const removeColumn = (index: number) => {
        const col = columnStates[index];
        if (col.isNew) {
            setColumnStates(columnStates.filter((_, i) => i !== index));
        } else {
            const newStates = [...columnStates];
            newStates[index] = { ...col, isDeleted: !col.isDeleted };
            setColumnStates(newStates);
        }
    };

    const updateColumn = (index: number, updates: Partial<ColumnState>) => {
        const newStates = [...columnStates];
        newStates[index] = { ...newStates[index], ...updates, isModified: !newStates[index].isNew };
        setColumnStates(newStates);
    };

    const handleSave = async () => {
        const alteration: TableAlteration = {
            addColumns: columnStates.filter(c => c.isNew && !c.isDeleted).map(({ isNew, isDeleted, isModified, oldName, ...c }) => c),
            modifyColumns: columnStates.filter(c => !c.isNew && c.isModified && !c.isDeleted).map(({ isNew, isDeleted, isModified, ...c }) => ({ ...c, oldName: c.oldName })),
            dropColumns: columnStates.filter(c => !c.isNew && c.isDeleted).map(c => c.oldName || c.name),
            renameTo: table // For now, keep table name same
        };

        const success = await onSave(alteration);
        if (success) onClose();
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border/40 shadow-2xl animate-in zoom-in-95 duration-300">
                <DialogHeader className="p-6 pb-2 bg-muted/20 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                            <Settings2 size={20} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                                {t('modifyModal.title')}: <span className="text-primary">{table}</span>
                            </DialogTitle>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1 opacity-60">
                                {t('modifyModal.subtitle', { host: database, engine: 'MySQL' })}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tighter text-muted-foreground/50 border-b pb-2 px-1">
                        <div className="flex-1 flex gap-4">
                            <span className="w-48">{t('modifyModal.columnName')}</span>
                            <span className="w-32">{t('modifyModal.type')}</span>
                            <span className="w-16 text-center">{t('modifyModal.null')}</span>
                            <span className="w-32">{t('modifyModal.default')}</span>
                            <span className="w-24">{t('modifyModal.key')}</span>
                        </div>
                        <div className="w-10" />
                    </div>

                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-2 pb-4">
                            {columnStates.map((col, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "group flex items-center gap-4 p-2 rounded-lg border transition-all duration-200",
                                        col.isDeleted ? "bg-destructive/5 border-destructive/20 opacity-50 grayscale" :
                                            col.isNew ? "bg-green-500/5 border-green-500/20" :
                                                col.isModified ? "bg-primary/5 border-primary/20" : "bg-background/40 border-border/20 hover:border-border/40"
                                    )}
                                >
                                    <div className="w-5 text-muted-foreground/30 flex justify-center">
                                        <GripVertical size={14} />
                                    </div>

                                    <div className="flex-1 flex gap-4 items-center">
                                        <div className="w-48 relative">
                                            <Input
                                                value={col.name}
                                                onChange={(e) => updateColumn(index, { name: e.target.value })}
                                                disabled={col.isDeleted}
                                                className="h-8 text-[12px] font-bold bg-background/50 border-muted-foreground/10 focus-visible:ring-primary/20"
                                            />
                                        </div>

                                        <div className="w-32">
                                            <Select
                                                value={col.type}
                                                onValueChange={(v) => updateColumn(index, { type: v })}
                                                disabled={col.isDeleted}
                                            >
                                                <SelectTrigger className="h-8 text-[11px] bg-background/50 border-muted-foreground/10 font-mono">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {/* Ensure current custom type is preserved */}
                                                    {!allGroupedTypes.includes(col.type) && (
                                                        <SelectItem value={col.type} className="text-[11px] font-mono">{col.type.toUpperCase()}</SelectItem>
                                                    )}

                                                    {Object.entries(typeGroups).map(([group, types]) => (
                                                        <React.Fragment key={group}>
                                                            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted/20">
                                                                {group}
                                                            </div>
                                                            {types.map(t => (
                                                                <SelectItem key={t} value={t} className="text-[11px] font-mono pl-4">
                                                                    {t.toUpperCase()}
                                                                </SelectItem>
                                                            ))}
                                                        </React.Fragment>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="w-16 flex justify-center">
                                            <Checkbox
                                                checked={col.nullable}
                                                onCheckedChange={(checked) => updateColumn(index, { nullable: !!checked })}
                                                disabled={col.isDeleted}
                                                className="h-4 w-4 rounded border-muted-foreground/30"
                                            />
                                        </div>

                                        <div className="w-32">
                                            {/* Smart Default Input */}
                                            {(col.type === 'boolean' || col.type === 'tinyint(1)') ? (
                                                <Select
                                                    value={col.default}
                                                    onValueChange={(v) => updateColumn(index, { default: v })}
                                                    disabled={col.isDeleted}
                                                >
                                                    <SelectTrigger className="h-8 text-[11px] bg-background/50 border-muted-foreground/10 font-mono">
                                                        <SelectValue placeholder="NULL" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="">{t('dataEditor.null')}</SelectItem>
                                                        <SelectItem value="1">{t('dataEditor.true')}</SelectItem>
                                                        <SelectItem value="0">{t('dataEditor.false')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    value={col.default}
                                                    onChange={(e) => updateColumn(index, { default: e.target.value })}
                                                    placeholder={col.type.includes('date') ? "NOW()" : "NULL"}
                                                    disabled={col.isDeleted}
                                                    className="h-8 text-[11px] font-mono bg-background/50 border-muted-foreground/10"
                                                />
                                            )}
                                        </div>

                                        <div className="w-24 flex justify-center items-center">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Toggle
                                                            pressed={col.key === 'PRI'}
                                                            onPressedChange={(pressed: boolean) => updateColumn(index, { key: pressed ? 'PRI' : '' })}
                                                            disabled={!col.isNew} // Only allow for new columns for now
                                                            variant="outline"
                                                            size="sm"
                                                            className={cn("h-6 w-6 p-0", col.key === 'PRI' ? "bg-amber-500 hover:bg-amber-600 text-white" : "")}
                                                        >
                                                            <Key size={12} />
                                                        </Toggle>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('modifyModal.primaryKeyTooltip')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>

                                    <div className="w-10 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeColumn(index)}
                                            className={cn(
                                                "h-8 w-8 transition-colors",
                                                col.isDeleted ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            )}
                                        >
                                            {col.isDeleted ? <Plus size={16} /> : <Trash2 size={16} />}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <Button
                        variant="ghost"
                        onClick={addColumn}
                        className="w-full h-10 border-2 border-dashed border-muted-foreground/10 hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary font-black uppercase tracking-widest text-[10px] gap-2 transition-all mt-2"
                    >
                        <Plus size={16} />
                        {t('modifyModal.appendAttribute')}
                    </Button>
                </div>

                <DialogFooter className="p-6 bg-muted/20 border-t gap-3">
                    <div className="flex-1 flex items-center gap-4">
                        {(columnStates.some(c => c.isNew || c.isModified || c.isDeleted)) && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 animate-pulse uppercase tracking-widest">
                                <AlertTriangle size={14} />
                                {t('modifyModal.pendingChanges')}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="h-10 px-6 text-[11px] font-bold uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive" onClick={onClose}>
                            {t('modifyModal.discardChanges')}
                        </Button>
                        <Button
                            className="h-10 px-8 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                            onClick={handleSave}
                            disabled={loading || !columnStates.some(c => c.isNew || c.isModified || c.isDeleted)}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {t('modifyModal.applyMigrations')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
