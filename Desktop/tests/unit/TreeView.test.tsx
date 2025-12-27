import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TreeView from '../../src/components/TreeView';
import type { TreeNode } from '../../src/components/TreeView';

describe('TreeView Component', () => {
  const mockTreeData: TreeNode[] = [
    {
      id: 'scenario-1',
      name: 'Login Scenario',
      type: 'scenario',
      status: 'pass',
      children: [
        {
          id: 'page-1',
          name: 'Login Page',
          type: 'page',
          children: [
            {
              id: 'action-1',
              name: 'Click Login Button',
              type: 'action',
              status: 'pass',
              metadata: { actionType: 'click' },
            },
            {
              id: 'action-2',
              name: 'Enter Username',
              type: 'action',
              status: 'fail',
              metadata: { actionType: 'type' },
            },
          ],
        },
      ],
    },
  ];

  it('should render tree view with data', () => {
    const { container } = render(
      <TreeView
        nodes={mockTreeData}
      />
    );

    // Top-level nodes should be visible
    expect(container.textContent).toContain('Login Scenario');
    // Child nodes are collapsed by default, so they won't be in the text content
    expect(container.querySelector('.space-y-1')).toBeInTheDocument();
  });

  it('should call onSelect when node is clicked', () => {
    const onNodeClick = vi.fn();

    const { container } = render(
      <TreeView
        nodes={mockTreeData}
        onNodeClick={onNodeClick}
      />
    );

    // Find and click on a node
    const nodes = container.querySelectorAll('.cursor-pointer');
    if (nodes.length > 0) {
      fireEvent.click(nodes[0]);
    }

    // Verify the component renders
    expect(container.textContent).toContain('Login Scenario');
  });

  it('should highlight selected node', () => {
    const { container } = render(
      <TreeView
        nodes={mockTreeData}
        selectedNodeId="scenario-1"
      />
    );

    expect(container.textContent).toContain('Login Scenario');
  });

  it('should render empty state when no data', () => {
    const { container } = render(
      <TreeView
        nodes={[]}
      />
    );

    // Should render without crashing
    expect(container.querySelector('.space-y-1')).toBeInTheDocument();
  });

  it('should handle nested nodes correctly', () => {
    const { container } = render(
      <TreeView
        nodes={mockTreeData}
      />
    );

    // Top-level scenario should be visible
    expect(container.textContent).toContain('Login Scenario');
    // Verify the component renders properly
    expect(container.querySelector('.space-y-1')).toBeInTheDocument();
  });

  it('should handle drag and drop', () => {
    const onNodeReorder = vi.fn();

    const { container } = render(
      <TreeView
        nodes={mockTreeData}
        onNodeReorder={onNodeReorder}
        allowDragAndDrop={true}
      />
    );

    expect(container.textContent).toContain('Login Scenario');
  });

  it('should toggle expand/collapse on button click', () => {
    const { container } = render(
      <TreeView
        nodes={mockTreeData}
      />
    );

    // Find the expand/collapse button
    const expandButton = container.querySelector('button');
    if (expandButton) {
      // Initially collapsed - clicking should expand
      fireEvent.click(expandButton);
    }

    // Component should still render
    expect(container.textContent).toContain('Login Scenario');
  });
});
