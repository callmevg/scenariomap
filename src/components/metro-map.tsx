
"use client";

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { UIElement, UIScenario } from '@/lib/types';

interface MetroMapProps {
  elements: UIElement[];
  scenarios: UIScenario[];
  onNodeClick: (element: UIElement) => void;
  scenarioColorScale: d3.ScaleOrdinal<string, string, never>;
}

type NodePosition = {
  id: string;
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
} & UIElement;


const GRID_SIZE = 120;
const NODE_RADIUS = 8;
const LINE_WIDTH = 5;
const STATION_OFFSET = 12; // How far lines stop from the center of a station

// Helper function to create a key for a grid position
const posKey = (x: number, y: number) => `${x},${y}`;

const MetroMap: React.FC<MetroMapProps> = ({ elements, scenarios, onNodeClick, scenarioColorScale }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);

  const initialLayout = useMemo(() => {
    if (elements.length === 0) return { nodes: [], links: [] };

    const elementMap = new Map(elements.map(el => [el.id, { ...el }]));
    const grid: { [key: string]: string } = {}; // Stores elementId at a grid position
    const positions: { [key: string]: { x: number, y: number } } = {}; // Stores grid coordinates for an elementId

    const isOccupied = (x: number, y: number) => !!grid[posKey(x, y)];

    const placeNode = (nodeId: string, x: number, y: number) => {
        if (!isOccupied(x, y)) {
            grid[posKey(x, y)] = nodeId;
            positions[nodeId] = { x, y };
            return true;
        }
        return false;
    };
    
    const longestScenario = [...scenarios].sort((a, b) => {
        const lengthA = a.methods.reduce((sum, p) => sum + p.length, 0);
        const lengthB = b.methods.reduce((sum, p) => sum + p.length, 0);
        return lengthB - lengthA;
    })[0];

    const placedNodes = new Set<string>();

    if (longestScenario) {
        const mainPath = longestScenario.methods.flat();
        mainPath.forEach((nodeId, i) => {
            if (!placedNodes.has(nodeId)) {
                placeNode(nodeId, i, 0);
                placedNodes.add(nodeId);
            }
        });
    }

    const queue: string[] = [...placedNodes];
    const visited = new Set<string>(placedNodes);

    while(queue.length > 0) {
        const nodeId = queue.shift()!;
        if (!positions[nodeId]) continue;

        const {x, y} = positions[nodeId];

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
                const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
                for (const [dx, dy] of directions) {
                    if (placeNode(neighborId, x + dx, y + dy)) {
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    let radius = 2;
                    while(!placed) {
                        for(let i = -radius; i <= radius; i++) {
                            for(let j = -radius; j <= radius; j++) {
                                if (Math.abs(i) === radius || Math.abs(j) === radius) {
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

    const laidOutNodes = elements
      .filter(el => positions[el.id])
      .map(node => ({
        ...node,
        x: positions[node.id].x * GRID_SIZE,
        y: positions[node.id].y * GRID_SIZE,
        fx: null,
        fy: null,
    }));

    return laidOutNodes;

  }, [elements, scenarios]);

  useEffect(() => {
    setNodePositions(initialLayout);
  }, [initialLayout]);


  const layout = useMemo(() => {
    if (nodePositions.length === 0) return { nodes: [], links: [] };
    
    const nodeMap = new Map(nodePositions.map(n => [n.id, n]));

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
    
    const linkGroups: { [key: string]: any[] } = {};
    links.forEach(link => {
      const key = (link.source.id < link.target.id) 
        ? `${link.source.id}-${link.target.id}` 
        : `${link.target.id}-${link.source.id}`;
      if (!linkGroups[key]) linkGroups[key] = [];
      linkGroups[key].push(link);
    });

    links.forEach(link => {
        const key = (link.source.id < link.target.id) 
            ? `${link.source.id}-${link.target.id}` 
            : `${link.target.id}-${link.source.id}`;
        const group = linkGroups[key];
        link.parallelIndex = group.indexOf(link);
        link.parallelTotal = group.length;
    });

    return { nodes: nodePositions, links };

  }, [nodePositions, scenarios]);

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
      
    const dataWidth = (d3.max(nodes, d => d.fx ?? d.x) || 0) - (d3.min(nodes, d => d.fx ?? d.x) || 0);
    const dataHeight = (d3.max(nodes, d => d.fy ?? d.y) || 0) - (d3.min(nodes, d => d.fy ?? d.y) || 0);
    
    const scale = Math.min(width / (dataWidth + GRID_SIZE*2), height / (dataHeight + GRID_SIZE*2)) * 0.9;
    const translateX = width / 2 - ((d3.min(nodes, d => d.fx ?? d.x) || 0) + dataWidth / 2) * scale;
    const translateY = height / 2 - ((d3.min(nodes, d => d.fy ?? d.y) || 0) + dataHeight / 2) * scale;
    
    const initialTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
    svg.call(zoom);
    svg.call(zoom.transform, initialTransform);


    const pathGenerator = (d: any) => {
      const { source, target, parallelIndex, parallelTotal } = d;
      
      const sourceX = source.fx ?? source.x;
      const sourceY = source.fy ?? source.y;
      const targetX = target.fx ?? target.x;
      const targetY = target.fy ?? target.y;
      
      const totalShift = LINE_WIDTH * 1.5;
      const offset = (parallelIndex - (parallelTotal - 1) / 2) * totalShift;

      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const nx = -dy / dist; // normal vector
      const ny = dx / dist;

      const sx = sourceX + nx * offset;
      const sy = sourceY + ny * offset;
      const tx = targetX + nx * offset;
      const ty = targetY + ny * offset;
      
      const sx2 = sx + (tx-sx) * STATION_OFFSET / dist;
      const sy2 = sy + (ty-sy) * STATION_OFFSET / dist;
      const tx2 = tx - (tx-sx) * STATION_OFFSET / dist;
      const ty2 = ty - (ty-sy) * STATION_OFFSET / dist;

      const path = d3.path();
      path.moveTo(sx2, sy2);
      
      const cornerRadius = GRID_SIZE / 4;
      
      // Use absolute differences to decide path shape
      if (Math.abs(tx - sx) > Math.abs(ty - sy)) { // Horizontal preference
          const midX = (sx + tx) / 2;
          path.arcTo(midX, sy, midX, ty, Math.min(cornerRadius, Math.abs(midX-sx)));
          path.arcTo(midX, ty, tx, ty, Math.min(cornerRadius, Math.abs(tx-midX)));
      } else { // Vertical preference
          const midY = (sy + ty) / 2;
          path.arcTo(sx, midY, tx, midY, Math.min(cornerRadius, Math.abs(midY-sy)));
          path.arcTo(tx, midY, tx, ty, Math.min(cornerRadius, Math.abs(ty-midY)));
      }
      path.lineTo(tx2, ty2);
      
      return path.toString();
    };

    container.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
        .attr('class', 'metro-link')
        .attr('d', pathGenerator)
        .attr('stroke', d => scenarioColorScale(d.scenarioId))
        .attr('stroke-width', LINE_WIDTH)
        .attr('fill', 'none')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

    const drag = d3.drag<SVGGElement, NodePosition>()
      .on('start', function(event, d) {
          d3.select(this).raise();
      })
      .on('drag', function(event, d) {
          const newPositions = nodePositions.map(n => {
              if (n.id === d.id) {
                  const newN = {...n};
                  // Restrict movement to horizontal or vertical
                  const dx = Math.abs(event.x - (newN.fx ?? newN.x));
                  const dy = Math.abs(event.y - (newN.fy ?? newN.y));
                  if (dx > dy) {
                    newN.fx = event.x;
                  } else {
                    newN.fy = event.y;
                  }
                  return newN;
              }
              return n;
          });
          setNodePositions(newPositions);
      })
      .on('end', function(event, d) {
          // Snap to grid on drag end if desired, or just leave it
      });

    const nodeGroup = container.append('g')
      .selectAll('g')
      .data(nodes, (d: any) => d.id)
      .join('g')
      .attr('transform', d => `translate(${d.fx ?? d.x},${d.fy ?? d.y})`)
      .on('click', (event, d) => onNodeClick(d))
      .attr('class', 'cursor-grab')
      .call(drag);

    nodeGroup.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', 'hsl(var(--background))')
      .attr('stroke', 'hsl(var(--foreground))')
      .attr('stroke-width', 3);

    nodeGroup.append('text')
        .attr('x', 0)
        .attr('y', NODE_RADIUS + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'hsl(var(--foreground))')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .text(d => d.name);

    nodeGroup.append('title')
      .text(d => d.name);
      
    // Update positions on re-render
    container.selectAll<SVGGElement, NodePosition>('.cursor-grab')
      .attr('transform', d => `translate(${d.fx ?? d.x},${d.fy ?? d.y})`);

    container.selectAll('.metro-link')
      .attr('d', pathGenerator);

  }, [layout, onNodeClick, scenarioColorScale, nodePositions]);

  return <svg ref={svgRef} className="w-full h-full bg-background/50"></svg>;
};

export default MetroMap;

    