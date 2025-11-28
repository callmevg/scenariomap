
"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { UIElement, UIScenario } from '@/lib/types';
import { Button } from './ui/button';
import { Undo2 } from 'lucide-react';

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

type LinkControlPoint = {
  x: number;
  y: number;
};

type LinkWithControlPoints = {
  source: NodePosition;
  target: NodePosition;
  scenarioId: string;
  parallelIndex: number;
  parallelTotal: number;
  controlPoints: LinkControlPoint[];
};

const GRID_SIZE = 120;
const NODE_RADIUS = 8;
const LINE_WIDTH = 5;
const STATION_OFFSET = 12;

const posKey = (x: number, y: number) => `${x},${y}`;

// --- History Hook ---
const useHistory = <T>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const setState = (action: React.SetStateAction<T>, overwrite = false) => {
    const newState = typeof action === 'function' ? (action as (prevState: T) => T)(history[index]) : action;
    if (overwrite) {
      const newHistory = [...history];
      newHistory[index] = newState;
      setHistory(newHistory);
    } else {
      const newHistory = history.slice(0, index + 1);
      newHistory.push(newState);
      setHistory(newHistory);
      setIndex(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const canUndo = index > 0;

  return [history[index], setState, undo, canUndo] as const;
};


const MetroMap: React.FC<MetroMapProps> = ({ elements, scenarios, onNodeClick, scenarioColorScale }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodePositions, setNodePositions, undoNodeMove, canUndo] = useHistory<NodePosition[]>([]);
  const [linkControls, setLinkControls] = useState<Record<string, LinkControlPoint[]>>({});


  const initialLayout = useMemo(() => {
    if (elements.length === 0) return { nodes: [], links: [] };

    const elementMap = new Map(elements.map(el => [el.id, { ...el }]));
    const grid: { [key: string]: string } = {};
    const positions: { [key: string]: { x: number, y: number } } = {};

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
    setNodePositions(initialLayout, true);
  }, [initialLayout]);


  const layout = useMemo(() => {
    if (nodePositions.length === 0) return { nodes: [], links: [] };
    
    const nodeMap = new Map(nodePositions.map(n => [n.id, n]));

    const links: LinkWithControlPoints[] = [];
    scenarios.forEach(scenario => {
      scenario.methods.forEach(method => {
        for (let i = 0; i < method.length - 1; i++) {
          const sourceNode = nodeMap.get(method[i]);
          const targetNode = nodeMap.get(method[i+1]);
          if (sourceNode && targetNode) {
            links.push({
              source: sourceNode,
              target: targetNode,
              scenarioId: scenario.id,
              parallelIndex: 0,
              parallelTotal: 0,
              controlPoints: [],
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

    links.forEach((link, i) => {
        const key = (link.source.id < link.target.id) 
            ? `${link.source.id}-${link.target.id}` 
            : `${link.target.id}-${link.source.id}`;
        const group = linkGroups[key];
        link.parallelIndex = group.indexOf(link);
        link.parallelTotal = group.length;

        const linkId = `${link.source.id}-${link.target.id}-${link.scenarioId}-${i}`;
        link.controlPoints = linkControls[linkId] || [];
    });

    return { nodes: nodePositions, links };

  }, [nodePositions, scenarios, linkControls]);

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

    const pathGenerator = (d: LinkWithControlPoints) => {
        const { source, target, parallelIndex, parallelTotal, controlPoints } = d;
        const sourceX = source.fx ?? source.x;
        const sourceY = source.fy ?? source.y;
        const targetX = target.fx ?? target.x;
        const targetY = target.fy ?? target.y;

        const totalShift = LINE_WIDTH * 1.5;
        const offset = (parallelIndex - (parallelTotal - 1) / 2) * totalShift;
        const cornerRadius = GRID_SIZE / 4;

        const points = [{x: sourceX, y: sourceY}, ...controlPoints, {x: targetX, y: targetY}];
        const path = d3.path();

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const nx = -dy / dist; // normal vector
            const ny = dx / dist;

            const sX = p1.x + nx * offset;
            const sY = p1.y + ny * offset;
            let tX = p2.x + nx * offset;
            let tY = p2.y + ny * offset;

            let startOffset = 0;
            let endOffset = 0;
            if (i === 0) startOffset = STATION_OFFSET;
            if (i === points.length - 2) endOffset = STATION_OFFSET;
            
            const sX2 = sX + (tX-sX) * startOffset / dist;
            const sY2 = sY + (tY-sY) * startOffset / dist;
            const tX2 = tX - (tX-sX) * endOffset / dist;
            const tY2 = tY - (tY-sY) * endOffset / dist;

            path.moveTo(sX2, sY2);

            if(i < points.length - 2) {
                const p3 = points[i+2];
                const nextDx = p3.x - p2.x;
                const nextDy = p3.y - p2.y;
                const nextDist = Math.sqrt(nextDx*nextDx + nextDy*nextDy);
                const nextNx = -nextDy / nextDist;
                const nextNy = nextDx / nextDist;
                
                const cornerX = tX;
                const cornerY = tY;

                const tX_arc_end = cornerX + nextNx * offset;
                const tY_arc_end = cornerY + nextNy * offset;

                path.arcTo(cornerX, cornerY, tX_arc_end, tY_arc_end, cornerRadius);

            } else {
                 path.lineTo(tX2, tY2);
            }
        }
        return path.toString();
    };

    const linkGroup = container.append('g')
      .selectAll('g')
      .data(links)
      .join('g')
      .attr('class', 'metro-link-group');

    linkGroup.append('path')
        .attr('class', 'metro-link')
        .attr('d', pathGenerator)
        .attr('stroke', d => scenarioColorScale(d.scenarioId))
        .attr('stroke-width', LINE_WIDTH)
        .attr('fill', 'none')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

    // Draggable Control Points for Lines
    const controlPointDrag = d3.drag<SVGCircleElement, {link: LinkWithControlPoints, pointIndex: number}>()
      .on('start', function() { d3.select(this).raise().attr("r", 8); })
      .on('drag', function(event, d) {
          const { link, pointIndex } = d;
          const newControls = [...(link.controlPoints || [])];
          newControls[pointIndex] = { x: event.x, y: event.y };

          const linkId = `${link.source.id}-${link.target.id}-${link.scenarioId}-${links.indexOf(link)}`;
          setLinkControls(prev => ({ ...prev, [linkId]: newControls }));
      })
      .on('end', function() { d3.select(this).attr("r", 6); });

    // Midpoint handles to create new control points
    const midpointHandleDrag = d3.drag<SVGRectElement, LinkWithControlPoints>()
        .on('start', function(event, d) {
            const linkId = `${d.source.id}-${d.target.id}-${d.scenarioId}-${links.indexOf(d)}`;
            const newPoint = { x: event.x, y: event.y };
            const newControls = [newPoint]; // For simplicity, start with one control point
            setLinkControls(prev => ({...prev, [linkId]: newControls}));
            d3.select(this).style('display', 'none'); // Hide handle after creating point
        });

    linkGroup.each(function(d, i) {
        if (!d.controlPoints || d.controlPoints.length === 0) {
            const pathNode = d3.select(this).select('path').node();
            if (pathNode) {
                const midpoint = pathNode.getPointAtLength(pathNode.getTotalLength() / 2);
                 d3.select(this).append('rect')
                    .attr('class', 'midpoint-handle')
                    .attr('x', midpoint.x - 5)
                    .attr('y', midpoint.y - 5)
                    .attr('width', 10)
                    .attr('height', 10)
                    .attr('fill', 'rgba(0, 255, 0, 0.5)')
                    .style('cursor', 'move')
                    .datum(d)
                    .call(midpointHandleDrag as any);
            }
        } else {
             d.controlPoints.forEach((cp, pointIndex) => {
                 d3.select(this).append('circle')
                    .attr('class', 'control-point')
                    .attr('cx', cp.x)
                    .attr('cy', cp.y)
                    .attr('r', 6)
                    .attr('fill', 'rgba(0, 0, 255, 0.5)')
                    .style('cursor', 'move')
                    .datum({ link: d, pointIndex })
                    .call(controlPointDrag as any);
            });
        }
    });
      

    const nodeDrag = d3.drag<SVGGElement, NodePosition>()
      .on('start', function(event, d) {
          d3.select(this).raise();
      })
      .on('drag', function(event, d) {
          const newPositions = nodePositions.map(n => {
              if (n.id === d.id) {
                  const newN = {...n};
                  newN.fx = event.x;
                  newN.fy = event.y;
                  return newN;
              }
              return n;
          });
          setNodePositions(newPositions, true); // Overwrite history during drag
      })
      .on('end', function(event, d) {
          // Snap to grid
          const newX = Math.round(event.x / GRID_SIZE) * GRID_SIZE;
          const newY = Math.round(event.y / GRID_SIZE) * GRID_SIZE;
          
          const finalPositions = nodePositions.map(n => {
              if (n.id === d.id) {
                  return {...n, fx: newX, fy: newY};
              }
              return n;
          });
          setNodePositions(finalPositions); // Create new history entry on drop
      });

    const nodeGroup = container.append('g')
      .selectAll('g')
      .data(nodes, (d: any) => d.id)
      .join('g')
      .attr('transform', d => `translate(${d.fx ?? d.x},${d.fy ?? d.y})`)
      .on('click', (event, d) => onNodeClick(d))
      .attr('class', 'cursor-grab')
      .call(nodeDrag);

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
      
    container.selectAll<SVGGElement, NodePosition>('.cursor-grab')
      .attr('transform', d => `translate(${d.fx ?? d.x},${d.fy ?? d.y})`);

    container.selectAll('.metro-link')
      .attr('d', pathGenerator);

  }, [layout, onNodeClick, scenarioColorScale, nodePositions, setNodePositions, linkControls]);

  return (
    <div className="relative w-full h-full">
        <svg ref={svgRef} className="w-full h-full bg-background/50"></svg>
        <div className="absolute top-2 left-2">
            <Button onClick={undoNodeMove} disabled={!canUndo} variant="outline" size="sm">
                <Undo2 className="mr-2 h-4 w-4" />
                Undo Move
            </Button>
        </div>
    </div>
  );
};

export default MetroMap;

    