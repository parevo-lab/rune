import React, { useState, useMemo } from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ColumnInfo } from '@/types';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
    data: any[];
    columns: ColumnInfo[];
}

type ChartType = 'bar' | 'line' | 'area' | 'pie';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function DataVisualizer({ data, columns }: Props) {
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [xAxis, setXAxis] = useState<string>('');
    const [yAxis, setYAxis] = useState<string>('');

    // Auto-select defaults
    useMemo(() => {
        if (!xAxis && columns.length > 0) setXAxis(columns[0].name);
        if (!yAxis && columns.length > 1) {
            // Try to find a numeric column
            const numeric = columns.find(c => ['int', 'float', 'decimal', 'double', 'tinyint', 'bigint'].some(t => c.type.toLowerCase().includes(t)));
            setYAxis(numeric ? numeric.name : columns[1].name);
        } else if (!yAxis && columns.length > 0) {
            setYAxis(columns[0].name);
        }
    }, [columns]);

    const renderChart = () => {
        if (!xAxis || !yAxis) return <div className="flex h-full items-center justify-center text-muted-foreground">Select X and Y axes to generate chart</div>;

        const CommonProps = {
            data: data,
            margin: { top: 20, right: 30, left: 20, bottom: 5 }
        };

        const AxisProps = (
            <>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey={xAxis} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Legend />
            </>
        );

        switch (chartType) {
            case 'bar':
                return (
                    <BarChart {...CommonProps}>
                        {AxisProps}
                        <Bar dataKey={yAxis} fill="#8884d8" radius={[4, 4, 0, 0]} animationDuration={1000} />
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart {...CommonProps}>
                        {AxisProps}
                        <Line type="monotone" dataKey={yAxis} stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} animationDuration={1000} />
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart {...CommonProps}>
                        {AxisProps}
                        <Area type="monotone" dataKey={yAxis} stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} animationDuration={1000} />
                    </AreaChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey={yAxis}
                            nameKey={xAxis}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 p-4 animate-in fade-in zoom-in-95 duration-300">
            <Card className="p-4 flex flex-wrap gap-4 items-center bg-muted/30 border-none shadow-inner">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chart Type</span>
                    <div className="flex gap-1 bg-background rounded-lg p-1 border shadow-sm">
                        <Button
                            variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setChartType('bar')}
                        >
                            <BarChart3 size={16} />
                        </Button>
                        <Button
                            variant={chartType === 'line' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setChartType('line')}
                        >
                            <LineChartIcon size={16} />
                        </Button>
                        <Button
                            variant={chartType === 'area' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setChartType('area')}
                        >
                            <Activity size={16} />
                        </Button>
                        <Button
                            variant={chartType === 'pie' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setChartType('pie')}
                        >
                            <PieChartIcon size={16} />
                        </Button>
                    </div>
                </div>

                <div className="w-px h-8 bg-border/50 mx-2" />

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">X Axis</span>
                    <Select value={xAxis} onValueChange={setXAxis}>
                        <SelectTrigger className="w-[180px] h-8 text-xs font-mono bg-background">
                            <SelectValue placeholder="Select Column" />
                        </SelectTrigger>
                        <SelectContent>
                            {columns.map(col => (
                                <SelectItem key={col.name} value={col.name} className="text-xs font-mono">
                                    {col.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Y Axis (Value)</span>
                    <Select value={yAxis} onValueChange={setYAxis}>
                        <SelectTrigger className="w-[180px] h-8 text-xs font-mono bg-background">
                            <SelectValue placeholder="Select Column" />
                        </SelectTrigger>
                        <SelectContent>
                            {columns.map(col => (
                                <SelectItem key={col.name} value={col.name} className="text-xs font-mono">
                                    {col.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            <div className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm p-4 relative overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart() || <div />}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
