import React, { useState } from 'react';
import { ChevronRight, ChevronDown, GripVertical, CheckCircle2, AlertCircle } from 'lucide-react';

export interface TreeNode {
  id: string;
  type: 'scenario' | 'page' | 'action';
  name: string;
  status?: 'pass' | 'fail' | 'warning';
  icon?: React.ElementType;
  children?: TreeNode[];
  metadata?: Record<string, any>;
}

interface TreeViewProps {
  nodes: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  onNodeReorder?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  selectedNodeId?: string;
  className?: string;
  allowDragAndDrop?: boolean;
}

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  onNodeClick,
  onNodeReorder,
  selectedNodeId,
  className = '',
  allowDragAndDrop = true,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const toggleExpanded = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleDragStart = (nodeId: string, event: React.DragEvent) => {
    setDraggedNodeId(nodeId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', nodeId);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string, position: 'before' | 'after' | 'inside', event: React.DragEvent) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain') || draggedNodeId;

    if (draggedId && draggedId !== targetId && onNodeReorder) {
      onNodeReorder(draggedId, targetId, position);
    }

    setDraggedNodeId(null);
  };

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    const getStatusIcon = () => {
      switch (node.status) {
        case 'pass':
          return <CheckCircle2 className="w-3 h-3 text-green-500" />;
        case 'fail':
          return <AlertCircle className="w-3 h-3 text-red-500" />;
        default:
          return null;
      }
    };

    const getNodeStyles = () => {
      const baseStyles = 'flex items-center gap-2 text-xs p-1 hover:bg-slate-800 rounded cursor-pointer transition-colors';
      const selectedStyles = isSelected ? 'bg-slate-700 border border-primary/50' : '';
      const dragStyles = draggedNodeId === node.id ? 'opacity-50' : '';

      return `${baseStyles} ${selectedStyles} ${dragStyles}`;
    };

    return (
      <div key={node.id} className="select-none">
        <div
          className={getNodeStyles()}
          onClick={() => onNodeClick?.(node)}
          draggable={allowDragAndDrop}
          onDragStart={(e) => handleDragStart(node.id, e)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(node.id, 'inside', e)}
        >
          {/* Drag Handle */}
          {allowDragAndDrop && (
            <div className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing">
              <GripVertical className="w-3 h-3 text-slate-500" />
            </div>
          )}

          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => toggleExpanded(node.id, e)}
              className="p-0.5 hover:bg-slate-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )}
            </button>
          )}

          {/* Node Icon/Status */}
          {getStatusIcon()}

          {/* Node Name */}
          <span className="flex-1 text-slate-300 truncate">
            {node.name}
          </span>

          {/* Node Type Badge for scenarios and pages */}
          {node.type === 'scenario' && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase">
              SCENARIO
            </span>
          )}
          {node.type === 'page' && (
            <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-mono rounded">
              {node.name}
            </span>
          )}
          {node.type === 'action' && (
            <span className="px-1 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded">
              {node.metadata?.actionType || 'action'}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-4 pl-2 border-l border-slate-700 space-y-1">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-1 group ${className}`}>
      {nodes.map(node => renderNode(node))}
    </div>
  );
};

export default TreeView;
