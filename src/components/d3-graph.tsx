
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { UIElement, UIScenario } from '@/lib/types';

interface D3GraphProps {
  elements: UIElement[];
  scenarios: UIScenario[];
  onNodeClick: (element: UIElement) => void;
  hoveredScenarioId: string | null;
  scenarioColorScale: d3.ScaleOrdinal<string, string, never>;
}

const D3Graph: React.FC<D3GraphProps> = ({ elements, scenarios, onNodeClick, hoveredScenarioId, scenarioColorScale }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined>>();

  const validScenarios = useMemo(() => scenarios.filter(f => f && f.id && f.methods && f.methods.length > 0), [scenarios]);
  
  const sanitizeId = (id: string) => id.replace(/[.\s]/g, '-');
  
  const elementScenarioCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    elements.forEach(el => counts[el.id] = 0);
    validScenarios.forEach(scenario => {
        const uniqueElementsInScenario = new Set<string>();
        scenario.methods.forEach(method => {
            method.forEach(elementId => {
                uniqueElementsInScenario.add(elementId);
            });
        });
        uniqueElementsInScenario.forEach(elementId => {
            if (counts[elementId] !== undefined) {
                counts[elementId]++;
            }
        });
    });
    return counts;
  }, [elements, validScenarios]);

  const radiusScale = useMemo(() => {
      const counts = Object.values(elementScenarioCounts);
      const minCount = Math.min(...counts) || 1;
      const maxCount = Math.max(...counts) || 1;
      return d3.scaleSqrt().domain([minCount, maxCount]).range([25, 45]);
  }, [elementScenarioCounts]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const allNodes = svg.selectAll<SVGCircleElement, UIElement>('.node-circle');

    if (hoveredScenarioId) {
        const hoveredScenario = validScenarios.find(f => f.id === hoveredScenarioId);
        const hoveredElementIds = new Set(hoveredScenario?.methods.flat());

        svg.selectAll('.link').attr('stroke-opacity', 0.1);
        svg.selectAll(`.scenario-${sanitizeId(hoveredScenarioId)}`).attr('stroke-opacity', 1).attr('stroke-width', 3);
        svg.selectAll('marker').style('visibility', 'hidden');
        svg.select(`#arrow-${sanitizeId(hoveredScenarioId)}`).style('visibility', 'visible');
        
        allNodes
            .attr('stroke', d => {
                if (d.isBuggy) return 'hsl(var(--destructive))';
                return hoveredElementIds.has(d.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))';
            })
            .attr('stroke-width', d => {
                 if (d.isBuggy) return 4;
                 return hoveredElementIds.has(d.id) ? 3 : 2;
            });

    } else {
        svg.selectAll('.link').attr('stroke-opacity', 0.7).attr('stroke-width', 2);
        svg.selectAll('marker').style('visibility', 'visible');
        allNodes
            .attr('stroke', d => d.isBuggy ? 'hsl(var(--destructive))' : 'hsl(var(--border))')
            .attr('stroke-width', d => d.isBuggy ? 4 : 2);
    }
  }, [hoveredScenarioId, validScenarios, sanitizeId]);


  useEffect(() => {
    if (!svgRef.current || !elements) return;

    const svg = d3.select(svgRef.current);
    const width = svg.node()!.getBoundingClientRect().width;
    const height = svg.node()!.getBoundingClientRect().height;
    
    svg.selectAll('*').remove();

    const container = svg.append('g');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    svg.call(zoom);

    container.append('defs').selectAll('marker')
      .data(validScenarios.map(f => f.id))
      .join('marker')
        .attr('id', d => `arrow-${sanitizeId(d)}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 4)
        .attr('markerHeight', 4)
        .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', d => scenarioColorScale(d));

    const nodes = elements.map(d => ({ ...d }));
    const nodeIds = new Set(elements.map(e => e.id));
    
    const links: any[] = [];
    validScenarios.forEach(scenario => {
      if (!scenario.methods) return;
      scenario.methods.forEach(method => {
        for (let i = 0; i < method.length - 1; i++) {
          if (nodeIds.has(method[i]) && nodeIds.has(method[i+1])) {
              links.push({
                source: method[i],
                target: method[i + 1],
                scenarioId: scenario.id,
                scenarioName: scenario.name
              });
          }
        }
      });
    });

    const linkGroups: { [key: string]: any[] } = {};
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const key = `${sourceId}-${targetId}`;
      const reverseKey = `${targetId}-${sourceId}`;

      if (linkGroups[reverseKey]) {
          linkGroups[reverseKey].push(link);
          link.isReverse = true;
      } else {
        if (!linkGroups[key]) linkGroups[key] = [];
        linkGroups[key].push(link);
        link.isReverse = false;
      }
    });

    links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const key = link.isReverse ? `${targetId}-${sourceId}` : `${sourceId}-${targetId}`;
        const group = linkGroups[key];
        link.parallelIndex = group.indexOf(link);
        link.parallelTotal = group.length;
    });

    if (!simulationRef.current) {
        simulationRef.current = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(200))
            .force('charge', d3.forceManyBody().strength(-600))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => radiusScale(elementScenarioCounts[(d as UIElement).id] || 1) + 15));
    } else {
        simulationRef.current.nodes(nodes as d3.SimulationNodeDatum[]);
        (simulationRef.current.force('link') as d3.ForceLink<any, any>).links(links);
    }
    
    const simulation = simulationRef.current;

    const link = container.append('g')
      .selectAll('g')
      .data(links)
      .join('g');

    link.append('path')
      .attr('class', d => `link scenario-${sanitizeId(d.scenarioId)}`)
      .attr('stroke-width', 2)
      .attr('stroke', d => scenarioColorScale(d.scenarioId))
      .attr('stroke-opacity', 0.7)
      .attr('fill', 'none')
      .attr('marker-end', d => `url(#arrow-${sanitizeId(d.scenarioId)})`)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 4);
      })
      .on('mouseout', function(event, d) {
        const isHovered = hoveredScenarioId === d.scenarioId;
        d3.select(this).attr('stroke-width', isHovered ? 3 : 2);
      });
    
    link.append('title')
        .text(d => d.scenarioName);


    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .call(drag(simulation, onNodeClick));

    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => radiusScale(elementScenarioCounts[d.id] || 1))
      .attr('fill', 'hsl(var(--card))')
      .attr('stroke', d => d.isBuggy ? 'hsl(var(--destructive))' : 'hsl(var(--border))')
      .attr('stroke-width', d => d.isBuggy ? 4 : 2);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'hsl(var(--foreground))')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .text(d => {
        const r = radiusScale(elementScenarioCounts[d.id] || 1);
        const maxChars = Math.floor(r * 2 / 7); // Rough estimate
        return d.name.length > maxChars ? d.name.substring(0, maxChars - 2) + '...' : d.name;
      });
      
    node.append("title")
        .text(d => d.name);

    simulation.on('tick', () => {
        link.select('path').attr('d', d => {
            const source = d.source as any;
            const target = d.target as any;
            
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dr = Math.sqrt(dx * dx + dy * dy);

            const sourceRadius = radiusScale(elementScenarioCounts[source.id] || 1);
            const targetRadius = radiusScale(elementScenarioCounts[target.id] || 1);
            
            const totalShift = 10;
            const offset = (d.parallelIndex - (d.parallelTotal - 1) / 2) * totalShift;
            
            let sweep = d.isReverse ? 1 : 0;
            if (d.parallelTotal > 1) {
              if (d.parallelIndex % 2 === 1) { // alternate sweep flag for parallel reverse paths
                sweep = 1 - sweep;
              }
            }
            
            // Adjust start and end points
            const sourcePoint = {
                x: source.x + (dx * sourceRadius / dr),
                y: source.y + (dy * sourceRadius / dr)
            };
            const targetPoint = {
                x: target.x - (dx * (targetRadius + 8) / dr), // +8 for arrowhead
                y: target.y - (dy * (targetRadius + 8) / dr)
            };

             if (d.parallelTotal <= 1) {
              return `M${sourcePoint.x},${sourcePoint.y}L${targetPoint.x},${targetPoint.y}`;
            }

            // Path for parallel links
            const arcRadius = dr * 1.5; // Make arc radius proportional to distance
            return `M${sourcePoint.x},${sourcePoint.y} A${arcRadius},${arcRadius} 0 0,${sweep} ${targetPoint.x},${targetPoint.y}`;
        });

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    simulation.alpha(0.3).restart();

    return () => {
        simulation.stop();
    };

  }, [elements, validScenarios, onNodeClick, scenarioColorScale, radiusScale, elementScenarioCounts, sanitizeId, hoveredScenarioId]);

  const drag = (simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>, onClick: (d: any) => void) => {
    let dragStartPos: { x: number, y: number } | null = null;

    function dragstarted(event: d3.D3DragEvent<any, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      dragStartPos = { x: event.x, y: event.y };
    }
    
    function dragged(event: d3.D3DragEvent<any, any, any>, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: d3.D3DragEvent<any, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      
      if (dragStartPos) {
        const dist = Math.sqrt(Math.pow(event.x - dragStartPos.x, 2) + Math.pow(event.y - dragStartPos.y, 2));
        if (dist < 5) { // If drag distance is small, treat it as a click
          onClick(d);
        }
      }
      dragStartPos = null;
    }
    
    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
  }

  return <svg ref={svgRef} className="w-full h-full"></svg>;
};

export default D3Graph;
