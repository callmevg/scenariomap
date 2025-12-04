
"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { UIElement, UIScenario } from '@/lib/types';
import { Button } from './ui/button';
import { Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetroMapProps {
  elements: UIElement[];
  scenarios: UIScenario[];
  onNodeClick: (element: UIElement) => void;
  scenarioColorScale: d3.ScaleOrdinal<string, string, never>;
  hoveredScenarioId: string | null;
  onScenarioHover: (scenarioId: string | null) => void;
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


const MetroMap: React.FC<MetroMapProps> = ({ elements, scenarios, onNodeClick, scenarioColorScale, hoveredScenarioId, onScenarioHover }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [nodePositions, setNodePositions, undoNodeMove, canUndo] = useHistory<NodePosition[]>([]);
  const [linkControls, setLinkControls] = useState<Record<string, LinkControlPoint[]>>({});
  const initialZoomDone = useRef(false);


  const initialLayout = useMemo(() => {
    if (elements.length === 0) return [];

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

    // Place any unplaced nodes
    elements.forEach(el => {
        if (!positions[el.id]) {
            let x = 0, y = 0, placed = false;
            while(!placed) {
                for (let i = 0; i < x + 1; i++) {
                   if (placeNode(el.id, i, y)) { placed = true; break; }
                }
                if (placed) break;
                for (let i = 0; i < y + 1; i++) {
                   if (placeNode(el.id, x, i)) { placed = true; break; }
                }
                x++; y++;
            }
        }
    });

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


  const layout = useMemo(() => {
    if (!Array.isArray(nodePositions) || nodePositions.length === 0) return { nodes: [], links: [] };
    
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


  // Effect for hover highlighting
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const allNodes = svg.selectAll('.metro-node-group');
    const allLinks = svg.selectAll('path.metro-link');

    const currentHoveredScenario = scenarios.find(f => f.id === hoveredScenarioId);

    if (hoveredScenarioId && currentHoveredScenario) {
        const hoveredElementIds = new Set(currentHoveredScenario.methods.flat());

        allLinks.style('opacity', 0.1);
        allNodes.style('opacity', 0.5);

        const hoveredLinks = allLinks.filter(d => (d as LinkWithControlPoints).scenarioId === hoveredScenarioId);
        
        hoveredLinks.style('opacity', 1).raise();
        
        const hoveredNodes = allNodes.filter(d => hoveredElementIds.has((d as NodePosition).id));
        hoveredNodes.style('opacity', 1).raise();

    } else {
        allLinks.style('opacity', 1);
        allNodes.style('opacity', 1);
    }
  }, [hoveredScenarioId, scenarios]);

  // Effect for initial container setup
  useEffect(() => {
      if (!svgRef.current || containerRef.current) return;
      const svg = d3.select(svgRef.current);
      containerRef.current = svg.append('g').node();
      
      return () => {
          svg.selectAll('g').remove();
          containerRef.current = null;
      };
  }, []);
  
  // Effect to setup zoom behavior
  useEffect(() => {
    if (!svgRef.current || zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            if (containerRef.current) {
                d3.select(containerRef.current).attr('transform', event.transform);
            }
        });
    
    svg.call(zoom);
    zoomRef.current = zoom;

    return () => {
        svg.on('.zoom', null);
        zoomRef.current = null;
    }
  }, []);

  // Effect to set initial zoom (runs only once)
  useEffect(() => {
      if (!svgRef.current || !zoomRef.current || !layout.nodes.length || initialZoomDone.current) return;
      
      const svg = d3.select(svgRef.current);
      const zoom = zoomRef.current;
      const { nodes } = layout;

      const bounds = svg.node()!.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;

      const xExtent = d3.extent(nodes, d => d.fx ?? d.x);
      const yExtent = d3.extent(nodes, d => d.fy ?? d.y);

      if (xExtent[0] === undefined || xExtent[1] === undefined || yExtent[0] === undefined || yExtent[1] === undefined) return;

      const dataWidth = xExtent[1] - xExtent[0];
      const dataHeight = yExtent[1] - yExtent[0];
      
      const scale = Math.min(bounds.width / (dataWidth + GRID_SIZE*2), bounds.height / (dataHeight + GRID_SIZE*2)) * 0.9;
      const translateX = bounds.width / 2 - (xExtent[0] + dataWidth / 2) * scale;
      const translateY = bounds.height / 2 - (yExtent[0] + dataHeight / 2) * scale;
      
      const initialTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
      
      svg.call(zoom.transform, initialTransform);
      initialZoomDone.current = true;

  }, [layout.nodes]);

  // Effect to set initial positions (runs only when initialLayout changes)
  useEffect(() => {
    if (initialLayout.length > 0) {
      setNodePositions(initialLayout, true);
    }
  }, [initialLayout, setNodePositions]);
  
  // Effect for drawing and updates
  useEffect(() => {
    if (!containerRef.current || !layout) return;

    const container = d3.select(containerRef.current);
    const { nodes, links } = layout;
    
    if (nodes.length === 0) {
      container.selectAll('*').remove();
      return;
    };

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
            if (dist === 0) continue;
            
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
                if (nextDist === 0) continue;

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

    // Group links by their source and target nodes to create single hit areas
    const hitAreaLinks = d3.groups(links, d => `${d.source.id}-${d.target.id}`);

    const linkGroup = container.selectAll('g.metro-link-group')
      .data(links, (d:any) => `${d.source.id}-${d.target.id}-${d.scenarioId}`);
      
    const linkGroupEnter = linkGroup.enter()
      .append('g')
      .attr('class', 'metro-link-group');

    linkGroupEnter.append('path')
        .attr('class', 'metro-link');

    linkGroupEnter.append('title');

    const mergedLinkGroup = linkGroupEnter.merge(linkGroup);

    mergedLinkGroup.select('path.metro-link')
        .attr('d', pathGenerator)
        .attr('stroke', d => scenarioColorScale(d.scenarioId))
        .attr('stroke-width', LINE_WIDTH)
        .attr('fill', 'none')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .style('pointer-events', 'none'); // Disable pointer events on visible lines
    
    mergedLinkGroup.select('title')
      .text(d => scenarios.find(s => s.id === d.scenarioId)?.name || '');

    linkGroup.exit().remove();
    
    const hitAreaGroup = container.selectAll('g.hit-area-group')
        .data(hitAreaLinks, d => d[0]);

    const hitAreaGroupEnter = hitAreaGroup.enter()
        .append('g')
        .attr('class', 'hit-area-group');
    
    hitAreaGroupEnter.append('path')
        .attr('class', 'metro-link-hit-area')
        .attr('fill', 'transparent')
        .attr('stroke', 'transparent')
        .attr('stroke-width', LINE_WIDTH + 10) // Make hit area larger
        .attr('stroke-linecap', 'round');

    hitAreaGroup.exit().remove();
    
    const mergedHitAreaGroup = hitAreaGroupEnter.merge(hitAreaGroup);

    mergedHitAreaGroup.select('path.metro-link-hit-area')
      .datum(d => d[1]) // Bind the array of links for this segment
      .attr('d', (linksInGroup: any) => {
        // Use the path of the first link for the hit area shape.
        // This assumes parallel links follow roughly the same path.
        return pathGenerator(linksInGroup[0]);
      })
      .on('mouseover', function(event, linksInGroup: any) {
        // Get the topmost element at the cursor position
        const topElement = document.elementFromPoint(event.clientX, event.clientY);
        if (topElement && topElement.classList.contains('metro-link')) {
            const d3TopElement = d3.select<Element, LinkWithControlPoints>(topElement);
            const topData = d3TopElement.datum();
            if (topData) {
                onScenarioHover(topData.scenarioId);
            }
        } else if (linksInGroup.length > 0) {
            // Fallback for when elementFromPoint fails: just use the first link in the group
             onScenarioHover(linksInGroup[0].scenarioId);
        }
      })
      .on('mouseout', () => {
        onScenarioHover(null);
      })
      .raise(); // Ensure hit area is on top
      

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

    const nodeGroup = container.selectAll('g.metro-node-group')
      .data(nodes, (d: any) => d.id)
      .join('g')
      .attr('class', 'metro-node-group cursor-grab')
      .on('click', (event, d) => onNodeClick(d))
      .call(nodeDrag);

    nodeGroup.attr('transform', d => `translate(${d.fx ?? d.x},${d.fy ?? d.y})`)

    nodeGroup.selectAll('circle').data(d => [d]).join('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', 'hsl(var(--background))')
      .attr('stroke', 'hsl(var(--foreground))')
      .attr('stroke-width', 3);

    nodeGroup.selectAll('text').data(d => [d]).join('text')
        .attr('x', 0)
        .attr('y', NODE_RADIUS + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'hsl(var(--foreground))')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .text(d => d.name);

    nodeGroup.selectAll('title').data(d => [d]).join('title')
      .text(d => d.name);

  }, [layout, onNodeClick, scenarioColorScale, nodePositions, setNodePositions, linkControls, onScenarioHover, scenarios]);

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

    