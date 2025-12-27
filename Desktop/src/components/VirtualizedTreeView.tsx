// ============================================================================
// TraceForge Desktop - Tree View Component
// Simplified tree view component for displaying hierarchical data
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, GripVertical, CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface TreeNode {
  id: string;
  type: 'scenario' | 'page' | 'action';
  name: string;
  status?: 'pass' | 'fail' | 'warning';
  icon?: React.ElementType;
  children?: TreeNode[];
  metadata?: Record<string, any>;
  parentId?: string;
  depth?: number;
}

interface VirtualizedTreeViewProps {
  nodes: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  onNodeReorder?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  selectedNodeId?: string;
  className?: string;
  allowDragAndDrop?: boolean;
  height?: number | string;
  itemHeight?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Flattens a tree structure into a linear array with depth information
 */
function flattenTree(nodes: TreeNode[], expandedIds: Set<string>, depth: number = 0): TreeNode[] {
  const result: TreeNode[] = [];

  for (const node of nodes) {
    const flattenedNode: TreeNode = {
      ...node,
      depth,
      parentId: depth > 0 ? nodes[0]?.id : undefined,
    };

    result.push(flattenedNode);

    // Recursively add children if expanded
    if (node.children && node.children.length > 0 && expandedIds.has(node.id)) {
      result.push(...flattenTree(node.children, expandedIds, depth + 1));
    }
  }

  return result;
}

// ============================================================================
// Tree Item Component
// ============================================================================

interface TreeItemProps {
  node: TreeNode;
  expandedIds: Set<string>;
  selectedNodeId?: string;
  draggedNodeId: string | null;
  onToggleExpand: (nodeId: string) => void;
  onNodeClick: (node: TreeNode) => void;
  onDragStart: (nodeId: string, event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (targetId: string, event: React.DragEvent) => void;
  allowDragAndDrop: boolean;
}

const TreeItem: React.FC<TreeItemProps> = React.memo(({
  node,
  expandedIds,
  selectedNodeId,
  draggedNodeId,
  onToggleExpand,
  onNodeClick,
  onDragStart,
  onDragOver,
  onDrop,
  allowDragAndDrop,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const isDragged = draggedNodeId === node.id;

  const getStatusIcon = () => {
    switch (node.status) {
      case 'pass':
        return <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />;
      case 'fail':
        return <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getNodeStyles = () => {
    const baseStyles = 'flex items-center gap-2 text-xs p-1 hover:bg-slate-800 rounded cursor-pointer transition-colors';
    const selectedStyles = isSelected ? 'bg-slate-700 border border-primary/50' : '';
    const dragStyles = isDragged ? 'opacity-50' : '';

    return `${baseStyles} ${selectedStyles} ${dragStyles}`;
  };

  const handleToggleExpand = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleExpand(node.id);
  }, [node.id, onToggleExpand]);

  const handleClick = useCallback(() => {
    onNodeClick(node);
  }, [node, onNodeClick]);

  const handleDragStart = useCallback((event: React.DragEvent) => {
    onDragStart(node.id, event);
  }, [node.id, onDragStart]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    onDragOver(event);
  }, [onDragOver]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    onDrop(node.id, event);
  }, [node.id, onDrop]);

  const indent = (node.depth || 0) * 16;

  return (
    <div
      style={{ paddingLeft: `${indent}px` }}
      className="select-none"
    >
      <div
        className={getNodeStyles()}
        onClick={handleClick}
        draggable={allowDragAndDrop}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Handle */}
        {allowDragAndDrop && (
          <div className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical className="w-3 h-3 text-slate-500" />
          </div>
        )}

        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={handleToggleExpand}
            className="p-0.5 hover:bg-slate-700 rounded flex-shrink-0"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
          </button>
        )}

        {/* Spacer for non-parent nodes */}
        {!hasChildren && <div className="w-4 flex-shrink-0" />}

        {/* Node Icon/Status */}
        {getStatusIcon()}

        {/* Node Name */}
        <span className="flex-1 text-slate-300 truncate" title={node.name}>
          {node.name}
        </span>

        {/* Node Type Badge */}
        {node.type === 'scenario' && (
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase flex-shrink-0">
            SCENARIO
          </span>
        )}
        {node.type === 'page' && (
          <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-mono rounded flex-shrink-0">
            {node.name}
          </span>
        )}
        {node.type === 'action' && (
          <span className="px-1 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded flex-shrink-0">
            {node.metadata?.actionType || 'action'}
          </span>
        )}
      </div>
    </div>
  );
});

TreeItem.displayName = 'TreeItem';

// ============================================================================
// Main Tree View Component
// ============================================================================

export const VirtualizedTreeView: React.FC<VirtualizedTreeViewProps> = React.memo(({
  nodes,
  onNodeClick,
  onNodeReorder,
  selectedNodeId,
  className = '',
  allowDragAndDrop = true,
  height = 600,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Flatten tree for rendering
  const flattenedNodes = useMemo(() => {
    return flattenTree(nodes, expandedIds, 0);
  }, [nodes, expandedIds]);

  // Toggle expand/collapse
  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((nodeId: string, event: React.DragEvent) => {
    setDraggedNodeId(nodeId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', nodeId);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const handleDrop = useCallback((targetId: string, event: React.DragEvent) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain') || draggedNodeId;

    if (draggedId && draggedId !== targetId && onNodeReorder) {
      onNodeReorder(draggedId, targetId, 'inside');
    }

    setDraggedNodeId(null);
  }, [draggedNodeId, onNodeReorder]);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();

    function collectIds(nodeList: TreeNode[]): void {
      for (const node of nodeList) {
        if (node.children && node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    }

    collectIds(nodes);
    setExpandedIds(allIds);
  }, [nodes]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Get visible count
  const visibleCount = flattenedNodes.length;

  return (
    <div className={`virtualized-tree-view ${className}`} style={{ height, overflowY: 'auto' }}>
      {/* Optional toolbar */}
      {visibleCount > 50 && (
        <div className="flex items-center gap-2 p-2 border-b border-slate-700 text-xs">
          <span className="text-slate-400">
            {visibleCount} visible nodes
          </span>
          <button
            onClick={expandAll}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
          >
            Collapse All
          </button>
        </div>
      )}

      {/* Tree items */}
      {flattenedNodes.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          expandedIds={expandedIds}
          selectedNodeId={selectedNodeId}
          draggedNodeId={draggedNodeId}
          onToggleExpand={toggleExpanded}
          onNodeClick={onNodeClick || (() => {})}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          allowDragAndDrop={allowDragAndDrop}
        />
      ))}
    </div>
  );
});

VirtualizedTreeView.displayName = 'VirtualizedTreeView';

export default VirtualizedTreeView;
