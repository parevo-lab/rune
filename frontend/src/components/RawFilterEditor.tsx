
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Code, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RawFilterEditorProps {
    currentFilter: string;
    onSave: (filter: string) => void;
}

export function RawFilterEditor({ currentFilter, onSave }: RawFilterEditorProps) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(currentFilter);
    const [error, setError] = useState<string | null>(null);

    // Update value when dialog opens or currentFilter changes externally (only if closed?)
    useEffect(() => {
        if (open) {
            setValue(currentFilter);
        }
    }, [open, currentFilter]);

    const handleSave = () => {
        // Basic validation (e.g. check for dangerous keywords? No, backend handles SQL injection safety to some extent, but raw WHERE clause is passed.
        // Wait, passing Raw WHERE clause to backend IS dangerous if not handled carefully.
        // The backend `BuildTableDataQuery` appends it. 
        // If the implementation is just `AND (filters)`, then string injection is possible if `filters` contains "1=1; DROP TABLE...".
        // The backend MUST ensure it's treated as a condition or the user (Application Owner) accepts the risk for this "Admin Tool".
        // Since this is a "DB Admin Tool" (like DataGrip), running arbitrary SQL is the POINT.
        // So we don't validate strictly.

        onSave(value);
        setOpen(false);
        toast.success("Raw filter applied");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/70 hover:text-primary" title="Edit Raw SQL Filter">
                    <Code size={14} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase flex items-center gap-2">
                        <Code size={16} />
                        Raw SQL Filter Editor
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Edit the <code className="bg-muted px-1 rounded">WHERE</code> clause directly.
                        Warning: Using column filters after this will overwrite your changes.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <Textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="font-mono text-xs min-h-[150px] bg-muted/30 resize-none"
                        placeholder="e.g. id > 5 AND (status = 'active' OR role = 'admin')"
                    />
                </div>

                <DialogFooter>
                    <div className="flex w-full justify-between items-center">
                        <Button variant="ghost" size="sm" onClick={() => setValue('')} className="text-xs text-muted-foreground">
                            Clear
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSave} className="gap-2">
                                <Save size={14} />
                                Apply
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
