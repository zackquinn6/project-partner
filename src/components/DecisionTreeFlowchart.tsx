import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowStep, DecisionPoint, Phase, Operation } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Save } from 'lucide-react';

interface DecisionTreeFlowchartProps {
  phases: Phase[];
  onBack: () => void;
  onUpdatePhases: (phases: Phase[]) => void;
}

// Custom node component for workflow steps
const StepNode = ({ data }: { data: any }) => {
  const getNodeColor = (flowType?: string) => {
    switch (flowType) {
      case 'prime': return 'bg-blue-100 border-blue-500 text-blue-900';
      case 'alternate': return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'if-necessary': return 'bg-gray-100 border-gray-500 text-gray-900';
      case 'inspection': return 'bg-purple-100 border-purple-500 text-purple-900';
      case 'repeat': return 'bg-green-100 border-green-500 text-green-900';
      default: return 'bg-white border-gray-300 text-gray-900';
    }
  };

  return (
    <Card className={`min-w-48 border-2 ${getNodeColor(data.step?.flowType)}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{data.step?.step || 'Unnamed Step'}</CardTitle>
        {data.step?.flowType && (
          <Badge variant="outline" className="text-xs w-fit">
            {data.step.flowType}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {data.step?.description || 'No description'}
        </p>
        {data.step?.isDecisionPoint && (
          <Badge variant="secondary" className="mt-2 text-xs">
            Decision Point
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

// Custom node component for decision points
const DecisionNode = ({ data }: { data: any }) => {
  return (
    <Card className="min-w-56 border-2 bg-yellow-100 border-yellow-500 text-yellow-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>🔀</span>
          Decision Point
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs font-medium">{data.decisionPoint?.question || 'What should be done?'}</p>
        <div className="mt-2 space-y-1">
          {data.decisionPoint?.options?.map((option: any, index: number) => (
            <Badge key={index} variant="outline" className="text-xs mr-1">
              {option.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const nodeTypes = {
  stepNode: StepNode,
  decisionNode: DecisionNode,
};

export const DecisionTreeFlowchart: React.FC<DecisionTreeFlowchartProps> = ({
  phases,
  onBack,
  onUpdatePhases,
}) => {
  // Convert workflow steps to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeIndex = 0;
    const stepPositions = new Map<string, { x: number; y: number }>();

    // Process each phase, operation, and step
    phases.forEach((phase, phaseIndex) => {
      phase.operations.forEach((operation, operationIndex) => {
        operation.steps.forEach((step, stepIndex) => {
          const x = operationIndex * 400 + stepIndex * 300;
          const y = phaseIndex * 200 + stepIndex * 150;
          
          stepPositions.set(step.id, { x, y });

          if (step.isDecisionPoint && step.decisionPoint) {
            // Decision point node
            nodes.push({
              id: step.id,
              type: 'decisionNode',
              position: { x, y },
              data: { step, decisionPoint: step.decisionPoint },
            });

            // Create edges for decision options
            step.decisionPoint.options.forEach((option, optionIndex) => {
              if (option.nextStepId) {
                edges.push({
                  id: `${step.id}-${option.id}`,
                  source: step.id,
                  target: option.nextStepId,
                  label: option.label,
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed },
                  style: { stroke: '#10b981' },
                });
              }
              if (option.alternateStepId) {
                edges.push({
                  id: `${step.id}-alt-${option.id}`,
                  source: step.id,
                  target: option.alternateStepId,
                  label: `Alt: ${option.label}`,
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed },
                  style: { stroke: '#f59e0b', strokeDasharray: '5,5' },
                });
              }
            });
          } else {
            // Regular step node
            nodes.push({
              id: step.id,
              type: 'stepNode',
              position: { x, y },
              data: { step },
            });

            // Connect to alternate step if defined
            if (step.alternateStepId) {
              edges.push({
                id: `${step.id}-alternate`,
                source: step.id,
                target: step.alternateStepId,
                label: 'Alternate',
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: '#f59e0b', strokeDasharray: '5,5' },
              });
            }

            // Connect sequential steps within operation
            if (stepIndex < operation.steps.length - 1) {
              const nextStep = operation.steps[stepIndex + 1];
              edges.push({
                id: `${step.id}-${nextStep.id}`,
                source: step.id,
                target: nextStep.id,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
              });
            }
          }

          nodeIndex++;
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [phases]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addDecisionPoint = () => {
    // Add a new decision point to the first phase/operation for simplicity
    if (phases.length > 0 && phases[0].operations.length > 0) {
      const newDecisionPoint: DecisionPoint = {
        id: `decision-${Date.now()}`,
        question: 'New Decision Point',
        description: 'Describe the decision to be made',
        options: [
          {
            id: `option-1-${Date.now()}`,
            label: 'Option A',
            value: 'option-a',
          },
          {
            id: `option-2-${Date.now()}`,
            label: 'Option B',
            value: 'option-b',
          },
        ],
        allowFreeText: true,
        stage: 'execution',
      };

      const newStep: WorkflowStep = {
        id: `step-${Date.now()}`,
        step: 'Decision Point',
        description: 'Make a decision about how to proceed',
        contentType: 'text',
        content: '',
        materials: [],
        tools: [],
        outputs: [],
        flowType: 'prime',
        isDecisionPoint: true,
        decisionPoint: newDecisionPoint,
      };

      const updatedPhases = [...phases];
      updatedPhases[0].operations[0].steps.push(newStep);
      onUpdatePhases(updatedPhases);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Structure
            </Button>
            <div>
              <h2 className="text-xl font-bold">Decision Tree Flowchart</h2>
              <p className="text-muted-foreground">
                Visualize and manage workflow decision points and branching logic
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={addDecisionPoint} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Decision Point
            </Button>
            <Button onClick={onBack} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save & Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-b bg-muted/30 p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Necessary Steps</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Alternate Steps</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span>Optional Steps</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Decision Points</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-orange-500" style={{ borderTop: '2px dashed #f59e0b' }}></div>
            <span>Alternate Path</span>
          </div>
        </div>
      </div>

      {/* Flowchart */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          style={{ backgroundColor: '#f8fafc' }}
        >
          <Controls />
          <MiniMap />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};