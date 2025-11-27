
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { UIElement, UIScenario } from '@/lib/types';

interface MetroMapProps {
  elements: UIElement[];
  scenarios: UIScenario[];
  onNodeClick: (element: UIElement) => void;
  scenarioColorScale: d3.ScaleOrdinal<string, string, never>;
}

const GRID_SIZE = 120;
const NODE_RADIUS = 8;
const LINE_WIDTH = 6;

// Helper function to create a key for a grid position
const posKey = (x: number, y: number) => `${x},${y}`;

const MetroMap: React.FC<MetroMapProps> = ({ elements, scenarios, onNodeClick, scenarioColorScale }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const layout = useMemo(() => {
    if (elements.length === 0) return { nodes: [], links: [] };

    const elementMap = new Map(elements.map(el => [el.id, { ...el }]));
    const grid: { [key: string]: string } = {}; // Stores elementId at a grid position
    const positions: { [key: string]: { x: number, y: number } } = {}; // Stores grid coordinates for an elementId

    // Function to check if a grid cell is occupied
    const isOccupied = (x: number, y: number) => !!grid[posKey(x, y)];

    // Function to place a node on the grid
    const placeNode = (nodeId: string, x: number, y: number) => {
        if (!isOccupied(x, y)) {
            grid[posKey(x, y)] = nodeId;
            positions[nodeId] = { x, y };
            return true;
        }
        return false;
    };
    
    // --- New Layout Algorithm ---

    // 1. Find the longest scenario to use as the backbone
    const longestScenario = [...scenarios].sort((a, b) => {
        const lengthA = a.methods.reduce((sum, p) => sum + p.length, 0);
        const lengthB = b.methods.reduce((sum, p) => sum + p.length, 0);
        return lengthB - lengthA;
    })[0];

    const placedNodes = new Set<string>();

    // 2. Place the longest scenario horizontally
    if (longestScenario) {
        const mainPath = longestScenario.methods.flat();
        mainPath.forEach((nodeId, i) => {
            if (!placedNodes.has(nodeId)) {
                placeNode(nodeId, i, 0);
                placedNodes.add(nodeId);
            }
        });
    }

    // 3. Place remaining nodes using a breadth-first approach
    const queue: string[] = [...placedNodes];
    const visited = new Set<string>(placedNodes);

    while(queue.length > 0) {
        const nodeId = queue.shift()!;
        if (!positions[nodeId]) continue;

        const {x, y} = positions[nodeId];

        // Find neighbors of this node from all scenarios
        const neighbors = new Set<string>();
        scenarios.forEach(scenario => {
            scenario.methods.forEach(method => {
                const index = method.indexOf(nodeId);
                if (index > 0) neighbors.add(method[index - 1]);
                if (index !== -1 && index < method.length - 1) neighbors.add(method[index + 1]);
            });
        });

        neighbors.forEach(neighborId => {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                let placed = false;
                // Try to place neighbors in adjacent cells (von Neumann neighborhood)
                const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
                for (const [dx, dy] of directions) {
                    if (placeNode(neighborId, x + dx, y + dy)) {
                        placed = true;
                        break;
                    }
                }
                // If all adjacent are occupied, spiral out (simple version)
                if (!placed) {
                    let radius = 2;
                    while(!placed) {
                        for(let i = -radius; i <= radius; i++) {
                            for(let j = -radius; j <= radius; j++) {
                                if (i === -radius || i === radius || j === -radius || j === radius) {
                                    if(placeNode(neighborId, x+i, y+j)) {
                                        placed = true;
                                        break;
                                    }
                                }
                            }
                            if(placed) break;
                        }
                        radius++;
                    }
                }
                if(placed) queue.push(neighborId);
            }
        });
    }

    // Convert grid coordinates to pixel coordinates
    const laidOutNodes = elements
      .filter(el => positions[el.id]) // Only include nodes that were placed
      .map(node => ({
        ...node,
        x: positions[node.id].x * GRID_SIZE,
        y: positions[node.id].y * GRID_SIZE,
    }));

    const nodeMap = new Map(laidOutNodes.map(n => [n.id, n]));

    const links: any[] = [];
    scenarios.forEach(scenario => {
      scenario.methods.forEach(method => {
        for (let i = 0; i < method.length - 1; i++) {
          const sourceNode = nodeMap.get(method[i]);
          const targetNode = nodeMap.get(method[i+1]);
          if (sourceNode && targetNode) {
            links.push({
              source: sourceNode,
              target: targetNode,
              scenarioId: scenario.id
            });
          }
        }
      });
    });

    return { nodes: laidOutNodes, links };

  }, [elements, scenarios]);

  useEffect(() => {
    if (!svgRef.current || !layout) return;

    const svg = d3.select(svgRef.current);
    const { nodes, links } = layout;
    
    const bounds = svg.node()!.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    
    svg.selectAll('*').remove();
    
    if (nodes.length === 0) return;

    const container = svg.append('g');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
      
    // Calculate initial transform
    const dataWidth = (d3.max(nodes, d => d.x) || 0) - (d3.min(nodes, d => d.x) || 0);
    const dataHeight = (d3.max(nodes, d => d.y) || 0) - (d3.min(nodes, d => d.y) || 0);
    
    const scale = Math.min(width / (dataWidth + GRID_SIZE*2), height / (dataHeight + GRID_SIZE*2)) * 0.9;
    const translateX = width / 2 - ((d3.min(nodes, d => d.x) || 0) + dataWidth / 2) * scale;
    const translateY = height / 2 - ((d3.min(nodes, d => d.y) || 0) + dataHeight / 2) * scale;
    
    const initialTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
    svg.call(zoom);
    svg.call(zoom.transform, initialTransform);


    // --- Draw Links ---
    container.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
        .attr('d', d => {
            const { source, target } = d;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            
            // Simple elbow connector
            if (Math.abs(dx) > Math.abs(dy)) {
              return `M${source.x},${source.y} L${source.x + dx/2},${source.y} L${source.x + dx/2},${target.y} L${target.x},${target.y}`;
            } else {
              return `M${source.x},${source.y} L${source.x},${source.y + dy/2} L${target.x},${source.y + dy/2} L${target.x},${target.y}`;
            }
        })
        .attr('stroke', d => scenarioColorScale(d.scenarioId))
        .attr('stroke-width', LINE_WIDTH)
        .attr('fill', 'none')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

    // --- Draw Nodes ---
    const nodeGroup = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('click', (event, d) => onNodeClick(d))
      .attr('class', 'cursor-pointer');

    nodeGroup.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', 'hsl(var(--background))')
      .attr('stroke', 'hsl(var(--foreground))')
      .attr('stroke-width', 3);

    nodeGroup.append('text')
        .attr('x', NODE_RADIUS + 5)
        .attr('y', 4)
        .attr('text-anchor', 'start')
        .attr('fill', 'hsl(var(--foreground))')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .text(d => d.name);

    nodeGroup.append('title')
      .text(d => d.name);

  }, [layout, onNodeClick, scenarioColorScale]);

  return <svg ref={svgRef} className="w-full h-full bg-background/50"></svg>;
};

export default MetroMap;
