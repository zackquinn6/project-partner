import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calculator, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LineItem {
  id: string;
  item: string;
  lowCost: number;
  highCost: number;
  units: number;
  type: 'material' | 'labor';
}

interface ProjectPlan {
  name: string;
  description: string;
  notes: string;
  lineItems: LineItem[];
  contingencyPercent: number;
  salesTaxPercent: number;
  state: string;
}

const US_STATES_TAX_RATES = {
  'AL': 4.0, 'AK': 0.0, 'AZ': 5.6, 'AR': 6.5, 'CA': 7.25, 'CO': 2.9, 'CT': 6.35, 'DE': 0.0,
  'FL': 6.0, 'GA': 4.0, 'HI': 4.17, 'ID': 6.0, 'IL': 6.25, 'IN': 7.0, 'IA': 6.0, 'KS': 6.5,
  'KY': 6.0, 'LA': 4.45, 'ME': 5.5, 'MD': 6.0, 'MA': 6.25, 'MI': 6.0, 'MN': 6.88, 'MS': 7.0,
  'MO': 4.23, 'MT': 0.0, 'NE': 5.5, 'NV': 6.85, 'NH': 0.0, 'NJ': 6.63, 'NM': 5.13, 'NY': 4.0,
  'NC': 4.75, 'ND': 5.0, 'OH': 5.75, 'OK': 4.5, 'OR': 0.0, 'PA': 6.0, 'RI': 7.0, 'SC': 6.0,
  'SD': 4.0, 'TN': 7.0, 'TX': 6.25, 'UT': 4.85, 'VT': 6.0, 'VA': 5.3, 'WA': 6.5, 'WV': 6.0,
  'WI': 5.0, 'WY': 4.0
};

const CONTINGENCY_OPTIONS = [0, 5, 10, 25, 50, 100];

export function SimpleProjectPlanning() {
  const [project, setProject] = useState<ProjectPlan>({
    name: '',
    description: '',
    notes: '',
    lineItems: [],
    contingencyPercent: 10,
    salesTaxPercent: 0,
    state: ''
  });

  const addLineItem = (type: 'material' | 'labor') => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      item: '',
      lowCost: 0,
      highCost: 0,
      units: 1,
      type
    };
    setProject(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  };

  const removeLineItem = (id: string) => {
    setProject(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setProject(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateProject = (field: keyof ProjectPlan, value: string | number) => {
    if (field === 'state' && typeof value === 'string') {
      const taxRate = US_STATES_TAX_RATES[value as keyof typeof US_STATES_TAX_RATES] || 0;
      setProject(prev => ({
        ...prev,
        [field]: value,
        salesTaxPercent: taxRate
      }));
    } else {
      setProject(prev => ({ ...prev, [field]: value }));
    }
  };

  const calculateSubtotal = () => {
    return project.lineItems.reduce((acc, item) => {
      const lowTotal = item.lowCost * item.units;
      const highTotal = item.highCost * item.units;
      return {
        low: acc.low + lowTotal,
        high: acc.high + highTotal
      };
    }, { low: 0, high: 0 });
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const contingencyMultiplier = 1 + (project.contingencyPercent / 100);
    const taxMultiplier = 1 + (project.salesTaxPercent / 100);
    
    const lowWithContingency = subtotal.low * contingencyMultiplier;
    const highWithContingency = subtotal.high * contingencyMultiplier;
    
    const finalLow = lowWithContingency * taxMultiplier;
    const finalHigh = highWithContingency * taxMultiplier;
    const expected = (finalLow + finalHigh) / 2;
    
    return { low: finalLow, high: finalHigh, expected };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();
  const materialItems = project.lineItems.filter(item => item.type === 'material');
  const laborItems = project.lineItems.filter(item => item.type === 'labor');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Simple Project Planning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project-name" className="text-sm font-medium">Project Name</Label>
              <Input
                id="project-name"
                value={project.name}
                onChange={(e) => updateProject('name', e.target.value)}
                placeholder="Enter project name"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="project-description" className="text-sm font-medium">Description</Label>
              <Input
                id="project-description"
                value={project.description}
                onChange={(e) => updateProject('description', e.target.value)}
                placeholder="Brief project description"
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="project-notes" className="text-sm font-medium">Project Notes</Label>
            <Textarea
              id="project-notes"
              value={project.notes}
              onChange={(e) => updateProject('notes', e.target.value)}
              placeholder="Add any additional project details, requirements, or considerations..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Materials Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Materials
                <Badge variant="secondary" className="text-xs">{materialItems.length}</Badge>
              </h3>
              <Button
                size="sm"
                onClick={() => addLineItem('material')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Material
              </Button>
            </div>

            {materialItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium">Item</TableHead>
                      <TableHead className="text-xs font-medium w-24">Low Cost</TableHead>
                      <TableHead className="text-xs font-medium w-24">High Cost</TableHead>
                      <TableHead className="text-xs font-medium w-16">Units</TableHead>
                      <TableHead className="text-xs font-medium w-24">Low Total</TableHead>
                      <TableHead className="text-xs font-medium w-24">High Total</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.item}
                            onChange={(e) => updateLineItem(item.id, 'item', e.target.value)}
                            placeholder="Material name"
                            className="text-xs border-0 p-1 h-7"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.lowCost}
                            onChange={(e) => updateLineItem(item.id, 'lowCost', parseFloat(e.target.value) || 0)}
                            className="text-xs border-0 p-1 h-7"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.highCost}
                            onChange={(e) => updateLineItem(item.id, 'highCost', parseFloat(e.target.value) || 0)}
                            className="text-xs border-0 p-1 h-7"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.units}
                            onChange={(e) => updateLineItem(item.id, 'units', parseFloat(e.target.value) || 1)}
                            className="text-xs border-0 p-1 h-7"
                            min="0.1"
                            step="0.1"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatCurrency(item.lowCost * item.units)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatCurrency(item.highCost * item.units)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLineItem(item.id)}
                            className="w-6 h-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Labor Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Labor
                <Badge variant="secondary" className="text-xs">{laborItems.length}</Badge>
              </h3>
              <Button
                size="sm"
                onClick={() => addLineItem('labor')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Labor
              </Button>
            </div>

            {laborItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium">Description</TableHead>
                      <TableHead className="text-xs font-medium w-24">Low Rate</TableHead>
                      <TableHead className="text-xs font-medium w-24">High Rate</TableHead>
                      <TableHead className="text-xs font-medium w-16">Hours</TableHead>
                      <TableHead className="text-xs font-medium w-24">Low Total</TableHead>
                      <TableHead className="text-xs font-medium w-24">High Total</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laborItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.item}
                            onChange={(e) => updateLineItem(item.id, 'item', e.target.value)}
                            placeholder="Labor description"
                            className="text-xs border-0 p-1 h-7"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.lowCost}
                            onChange={(e) => updateLineItem(item.id, 'lowCost', parseFloat(e.target.value) || 0)}
                            className="text-xs border-0 p-1 h-7"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.highCost}
                            onChange={(e) => updateLineItem(item.id, 'highCost', parseFloat(e.target.value) || 0)}
                            className="text-xs border-0 p-1 h-7"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.units}
                            onChange={(e) => updateLineItem(item.id, 'units', parseFloat(e.target.value) || 1)}
                            className="text-xs border-0 p-1 h-7"
                            min="0.1"
                            step="0.1"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatCurrency(item.lowCost * item.units)}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatCurrency(item.highCost * item.units)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLineItem(item.id)}
                            className="w-6 h-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Calculations Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Contingency</Label>
                <Select 
                  value={project.contingencyPercent.toString()} 
                  onValueChange={(value) => updateProject('contingencyPercent', parseInt(value))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTINGENCY_OPTIONS.map(percent => (
                      <SelectItem key={percent} value={percent.toString()}>
                        {percent}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">State (for sales tax)</Label>
                <Select 
                  value={project.state} 
                  onValueChange={(value) => updateProject('state', value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(US_STATES_TAX_RATES).map(([code, rate]) => (
                      <SelectItem key={code} value={code}>
                        {code} ({rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Sales Tax Rate</Label>
                <Input 
                  value={`${project.salesTaxPercent}%`}
                  readOnly
                  className="text-sm bg-muted"
                />
              </div>
            </div>

            {/* Cost Summary */}
            <Card className="bg-muted/20 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Project Cost Summary
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">
                      {formatCurrency(subtotal.low)} - {formatCurrency(subtotal.high)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-muted-foreground">
                    <span>+ Contingency ({project.contingencyPercent}%):</span>
                    <span className="font-mono">
                      {formatCurrency(subtotal.low * (project.contingencyPercent / 100))} - {formatCurrency(subtotal.high * (project.contingencyPercent / 100))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-muted-foreground">
                    <span>+ Sales Tax ({project.salesTaxPercent.toFixed(2)}%):</span>
                    <span className="font-mono">
                      {formatCurrency((subtotal.low * (1 + project.contingencyPercent / 100)) * (project.salesTaxPercent / 100))} - {formatCurrency((subtotal.high * (1 + project.contingencyPercent / 100)) * (project.salesTaxPercent / 100))}
                    </span>
                  </div>
                  
                  <hr className="my-2" />
                  
                  <div className="grid grid-cols-3 gap-4 text-lg font-semibold">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Low Estimate</div>
                      <div className="text-green-600">{formatCurrency(total.low)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Expected</div>
                      <div className="text-primary">{formatCurrency(total.expected)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">High Estimate</div>
                      <div className="text-orange-600">{formatCurrency(total.high)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}