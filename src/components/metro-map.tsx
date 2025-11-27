
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

const GRID_SIZE = 100;
const NODE_RADIUS = 8;
const LINE_WIDTH = 6;

const MetroMap: React.FC<MetroMapProps> = ({ elements, scenarios, onNodeClick, scenarioColorScale }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const layout = useMemo(() => {
    if (elements.length === 0) return { nodes: [], links: [] };

    const nodes: any[] = elements.map(el => ({ ...el }));
    const grid: { [key: string]: string } = {};
    const positions: { [key: string]: { x: number, y: number } } = {};
    
    const placeNode = (node: any, x: number, y: number) => {
        const key = `${x},${y}`;
        if (!grid[key]) {
            grid[key] = node.id;
            positions[node.id] = { x: x * GRID_SIZE, y: y * GRID_SIZE };
            return true;
        }
        return false;
    };
    
    // Simple greedy placement algorithm
    let x = 0, y = 0, dx = 1;
    nodes.forEach(node => {
        let placed = false;
        while (!placed) {
            if (placeNode(node, x, y)) {
                placed = true;
            } else {
                // Spiral outwards to find a free spot
                x += dx;
                if (x > y && x > 0) { dx = -1; }
                else if (x < -y) { dx = 1; }
                else if (dx === -1) { y--; }
                else if (dx === 1) { y++; }
            }
        }
    });

    const laidOutNodes = nodes.map(node => ({
        ...node,
        ...positions[node.id],
    }));

    const links: any[] = [];
    scenarios.forEach(scenario => {
      scenario.methods.forEach(method => {
        for (let i = 0; i < method.length - 1; i++) {
          const sourceId = method[i];
          const targetId = method[i+1];
          const sourceNode = laidOutNodes.find(n => n.id === sourceId);
          const targetNode = laidOutNodes.find(n => n.id === targetId);
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
    svg.call(zoom.transform, initialTransform);
    svg.call(zoom);


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
            return `M${source.x},${source.y} L${source.x},${target.y} L${target.x},${target.y}`;
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

    