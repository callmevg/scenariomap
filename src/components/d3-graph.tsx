
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

        svg.selectAll('.link').attr('stroke-opacity', 0.2);
        svg.selectAll(`.scenario-${sanitizeId(hoveredScenarioId)}`).attr('stroke-opacity', 1).attr('stroke-width', 5);
        svg.selectAll('marker').style('visibility', 'hidden');
        svg.select(`#arrow-${sanitizeId(hoveredScenarioId)}`).style('visibility', 'visible');
        
        allNodes
            .attr('stroke', d => {
                if (d.isBuggy) return 'hsl(var(--destructive))';
                return hoveredElementIds.has(d.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))';
            })
            .attr('stroke-width', d => {
                 if (d.isBuggy) return 4;
                 return hoveredElementIds.has(d.id) ? 3 : 2.5;
            });

    } else {
        svg.selectAll('.link').attr('stroke-opacity', 1).attr('stroke-width', 4);
        svg.selectAll('marker').style('visibility', 'visible');
        allNodes
            .attr('stroke', d => d.isBuggy ? 'hsl(var(--destructive))' : 'hsl(var(--border))')
            .attr('stroke-width', d => d.isBuggy ? 4 : 2.5);
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
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
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
      const key = (sourceId < targetId) ? `${sourceId}-${targetId}` : `${targetId}-${sourceId}`;
      if (!linkGroups[key]) linkGroups[key] = [];
      linkGroups[key].push(link);
    });

    links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const key = (sourceId < targetId) ? `${sourceId}-${targetId}` : `${targetId}-${sourceId}`;
        const group = linkGroups[key];
        link.parallelIndex = group.indexOf(link);
        link.parallelTotal = group.length;
    });

    if (!simulationRef.current) {
        simulationRef.current = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => radiusScale(elementScenarioCounts[(d as UIElement).id] || 1) + 10));
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
      .attr('stroke-width', 4)
      .attr('stroke', d => scenarioColorScale(d.scenarioId))
      .attr('fill', 'none')
      .attr('marker-end', d => `url(#arrow-${sanitizeId(d.scenarioId)})`)
      .on('mouseover', function(event, d) {
        d3.selectAll('.link').attr('stroke-opacity', 0.2);
        d3.selectAll(`.scenario-${sanitizeId(d.scenarioId)}`).attr('stroke-opacity', 1).attr('stroke-width', 5);
        svg.selectAll('marker').style('visibility', 'hidden');
        svg.select(`#arrow-${sanitizeId(d.scenarioId)}`).style('visibility', 'visible');
        
        const hoveredScenario = validScenarios.find(f => f.id === d.scenarioId);
        const hoveredElementIds = new Set(hoveredScenario?.methods.flat());
        container.selectAll<SVGCircleElement, UIElement>('.node-circle')
            .attr('stroke', (node_d) => {
                if (node_d.isBuggy) return 'hsl(var(--destructive))';
                return hoveredElementIds.has(node_d.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))';
            })
            .attr('stroke-width', (node_d) => {
                 if (node_d.isBuggy) return 4;
                 return hoveredElementIds.has(node_d.id) ? 3 : 2.5;
            });
      })
      .on('mouseout', function(event, d) {
        if (hoveredScenarioId && d.scenarioId !== hoveredScenarioId) {
             d3.selectAll('.link').attr('stroke-opacity', 0.2);
             d3.selectAll(`.scenario-${sanitizeId(hoveredScenarioId)}`).attr('stroke-opacity', 1).attr('stroke-width', 5);
             svg.selectAll('marker').style('visibility', 'hidden');
             svg.select(`#arrow-${sanitizeId(hoveredScenarioId)}`).style('visibility', 'visible');
        } else if (!hoveredScenarioId) {
            d3.selectAll('.link').attr('stroke-opacity', 1).attr('stroke-width', 4);
            svg.selectAll('marker').style('visibility', 'visible');
            container.selectAll<SVGCircleElement, UIElement>('.node-circle')
                .attr('stroke', node_d => node_d.isBuggy ? 'hsl(var(--destructive))' : 'hsl(var(--border))')
                .attr('stroke-width', node_d => node_d.isBuggy ? 4 : 2.5);
        }
      });
    
    link.append('title')
        .text(d => d.scenarioName);


    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .on('click', (event, d) => onNodeClick(d))
      .call(drag(simulation));

    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => radiusScale(elementScenarioCounts[d.id] || 1))
      .attr('fill', 'hsl(var(--card))')
      .attr('stroke', d => d.isBuggy ? 'hsl(var(--destructive))' : 'hsl(var(--border))')
      .attr('stroke-width', d => d.isBuggy ? 4 : 2.5);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'hsl(var(--foreground))')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .text(d => d.name.length > 12 ? d.name.substring(0, 10) + '...' : d.name);
      
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

            const sourcePoint = {
                x: source.x + (dx * sourceRadius / dr),
                y: source.y + (dy * sourceRadius / dr)
            };
            const targetPoint = {
                x: target.x - (dx * targetRadius / dr),
                y: target.y - (dy * targetRadius / dr)
            };
            
            if (d.parallelTotal <= 1) {
              return `M${sourcePoint.x},${sourcePoint.y}L${targetPoint.x},${targetPoint.y}`;
            }

            const totalShift = 15;
            const offset = (d.parallelIndex - (d.parallelTotal - 1) / 2) * totalShift / d.parallelTotal;
            
            const normX = -dy / dr;
            const normY = dx / dr;

            const midX = (sourcePoint.x + targetPoint.x) / 2 + offset * normX;
            const midY = (sourcePoint.y + targetPoint.y) / 2 + offset * normY;

            return `M${sourcePoint.x},${sourcePoint.y}Q${midX},${midY},${targetPoint.x},${targetPoint.y}`;
        });

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    simulation.alpha(0.3).restart();

    return () => {
        simulation.stop();
    };

  }, [elements, validScenarios, onNodeClick, scenarioColorScale, radiusScale, elementScenarioCounts, sanitizeId, hoveredScenarioId]);

  const drag = (simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) => {
    function dragstarted(event: d3.D3DragEvent<any, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: d3.D3DragEvent<any, any, any>, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: d3.D3DragEvent<any, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
  }

  return <svg ref={svgRef} className="w-full h-full"></svg>;
};

export default D3Graph;

    