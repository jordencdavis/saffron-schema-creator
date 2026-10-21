import React, { useState, useEffect, useCallback } from 'react';
import { ProjectConfig, FlowNode, FlowConnection, InterfaceModel, NodeType, CanonicalParameter, CustomParameter } from './types';
import { INITIAL_PROJECT } from './data/defaultPreset';
import { runSimulation } from './services/simulationEngine';
import { runValidation } from './services/validationEngine';
import { TopBar } from './components/TopBar';
import { InterfaceRibbon } from './components/InterfaceRibbon';
import { DataFlowCanvas } from './components/DataFlowCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ExecutionTracePanel } from './components/ExecutionTracePanel';
import { AddInterfaceModal } from './components/Modals/AddInterfaceModal';
import { ExportModal } from './components/Modals/ExportModal';

const STORAGE_KEY = 'flowweaver_iot_project_v1';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem('flowweaver_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    } catch (e) {
      // ignore
    }
    return 'light'; // White theme by default as requested!
  });

  const [showRibbon, setShowRibbon] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showBottomDock, setShowBottomDock] = useState(true);

  const [project, setProject] = useState<ProjectConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load project from localStorage, using initial preset', e);
    }
    return INITIAL_PROJECT;
  });

  const [simulationResult, setSimulationResult] = useState(() => runSimulation(INITIAL_PROJECT));
  const [diagnostics, setDiagnostics] = useState(() => runValidation(INITIAL_PROJECT));
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAddInterfaceOpen, setIsAddInterfaceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Sync theme
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('flowweaver_theme', next);
      } catch (e) {
        // ignore
      }
      return next;
    });
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
      console.warn('Failed to persist project to localStorage', e);
    }
  }, [project]);

  // Run initial validation whenever structure changes
  useEffect(() => {
    const diags = runValidation(project);
    setDiagnostics(diags);
  }, [project]);

  // Run Simulation Handler
  const handleRunSimulation = useCallback(() => {
    setIsSimulating(true);
    setTimeout(() => {
      const result = runSimulation(project);
      setSimulationResult(result);
      setIsSimulating(false);
    }, 150);
  }, [project]);

  // Validate Handler
  const handleValidate = useCallback(() => {
    const diags = runValidation(project);
    setDiagnostics(diags);
  }, [project]);

  // Auto Layout Stages Handler
  const handleAutoLayout = useCallback(() => {
    setProject((prev) => {
      const stageMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const updatedNodes = prev.nodes.map((node) => {
        const stage = node.stage || 1;
        const countAtStage = stageMap[stage] || 0;
        stageMap[stage] = countAtStage + 1;

        const stageX = (stage - 1) * 270 + 40;
        const stageY = countAtStage * 170 + 100;

        return {
          ...node,
          position: { x: stageX, y: stageY },
        };
      });

      return {
        ...prev,
        nodes: updatedNodes,
      };
    });
  }, []);

  // Reset to default 5-interface IoT preset
  const handleResetPreset = useCallback(() => {
    if (window.confirm('Reset workspace to the default 5-interface IoT example (DWIN -> ESP32 -> Firebase -> GUI -> Logger)?')) {
      setProject(INITIAL_PROJECT);
      const res = runSimulation(INITIAL_PROJECT);
      setSimulationResult(res);
      setDiagnostics(runValidation(INITIAL_PROJECT));
    }
  }, []);

  // Update Node Position
  const handleUpdateNodePosition = (id: string, pos: { x: number; y: number }) => {
    setProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, position: pos } : n)),
    }));
  };

  // Update Node Config
  const handleUpdateNode = (updated: FlowNode) => {
    setProject((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === updated.id ? updated : n)),
    }));
  };

  // Delete Node
  const handleDeleteNode = (id: string) => {
    setProject((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== id),
      connections: prev.connections.filter((c) => c.sourceNodeId !== id && c.targetNodeId !== id),
      selectedNodeId: prev.selectedNodeId === id ? null : prev.selectedNodeId,
    }));
  };

  // Add Node
  const handleAddNode = (type: NodeType, stage: number) => {
    const newNodeId = `node-${type}-${Date.now().toString().slice(-4)}`;
    const titles: Record<NodeType, { title: string; subtitle: string }> = {
      source: { title: 'Custom Source', subtitle: 'Ingest Stream' },
      hex_decoder: { title: 'UART Hex Parser', subtitle: 'Frame Unpack' },
      json_parser: { title: 'JSON Stream Parser', subtitle: 'Object Extractor' },
      csv_parser: { title: 'CSV Column Parser', subtitle: 'Tabular Unpack' },
      rename: { title: 'Field Key Renamer', subtitle: 'Path Mapping' },
      transform: { title: 'Data Transform', subtitle: 'Expression Engine' },
      scaling: { title: 'Numeric Scaler', subtitle: 'ax + b Calibration' },
      unit_converter: { title: 'Unit Converter', subtitle: 'SI Unit Normalizer' },
      enricher: { title: 'Metadata Enricher', subtitle: 'Timestamp & Device ID' },
      filter: { title: 'Field Value Filter', subtitle: 'Condition Gate' },
      destination: { title: 'Output Sink', subtitle: 'Destination Terminal' },
    };

    const info = titles[type] || { title: 'Custom Node', subtitle: 'Processor' };

    const newNode: FlowNode = {
      id: newNodeId,
      type,
      title: info.title,
      subtitle: info.subtitle,
      stage,
      position: { x: 340 + Math.random() * 80, y: 220 + Math.random() * 80 },
      inputs: [{ id: 'in-1', name: 'Input', type: 'any' }],
      outputs: [{ id: 'out-1', name: 'Output', type: 'any' }],
      config: {
        multiplier: 1.0,
        offsetAdd: 0,
        frameHeader: '5AA5',
        endianness: 'big',
        addedDeviceId: 'ESP32-S3-LAB-01',
      },
    };

    setProject((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      selectedNodeId: newNodeId,
      selectedConnectionId: null,
    }));
  };

  // Add Connection
  const handleAddConnection = (
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string
  ) => {
    // Avoid duplicate connections between same ports
    const exists = project.connections.some(
      (c) =>
        c.sourceNodeId === sourceNodeId &&
        c.sourcePortId === sourcePortId &&
        c.targetNodeId === targetNodeId &&
        c.targetPortId === targetPortId
    );
    if (exists) return;

    const newConn: FlowConnection = {
      id: `conn-${Date.now().toString().slice(-4)}`,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId,
      isValid: true,
      mappings: [
        {
          id: `map-${Date.now()}`,
          sourceField: '',
          targetField: '',
          transformRule: 'direct',
        },
      ],
    };

    setProject((prev) => ({
      ...prev,
      connections: [...prev.connections, newConn],
      selectedConnectionId: newConn.id,
      selectedNodeId: null,
    }));
  };

  // Update Connection
  const handleUpdateConnection = (updated: FlowConnection) => {
    setProject((prev) => ({
      ...prev,
      connections: prev.connections.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  // Delete Connection
  const handleDeleteConnection = (id: string) => {
    setProject((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== id),
      selectedConnectionId: prev.selectedConnectionId === id ? null : prev.selectedConnectionId,
    }));
  };

  // Node Send Handler: Triggers payload transmission, updates simulation immediately
  const handleSendFromNode = useCallback((nodeId: string, payload: string) => {
    setProject((prev) => {
      const updatedNodes = prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, config: { ...n.config, lastSentPayload: payload } } : n
      );

      const targetNode = prev.nodes.find((n) => n.id === nodeId);
      let updatedInterfaces = prev.interfaces;
      if (targetNode?.interfaceId) {
        updatedInterfaces = prev.interfaces.map((iface) => {
          if (iface.id === targetNode.interfaceId) {
            const updatedSamples = iface.samples.map((s) =>
              s.id === iface.activeSampleId ? { ...s, rawPayload: payload } : s
            );
            return { ...iface, samples: updatedSamples };
          }
          return iface;
        });
      }

      const nextProject: ProjectConfig = {
        ...prev,
        nodes: updatedNodes,
        interfaces: updatedInterfaces,
      };

      const simRes = runSimulation(nextProject);
      setSimulationResult(simRes);
      return nextProject;
    });
  }, []);

  // Add Parameter to Node
  const handleAddParameterToNode = useCallback((nodeId: string, param: Omit<CustomParameter, 'id'>) => {
    setProject((prev) => {
      const updatedNodes = prev.nodes.map((n) => {
        if (n.id === nodeId) {
          const newParam: CustomParameter = {
            ...param,
            id: `param-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          };
          const customParameters = [...(n.config.customParameters || []), newParam];
          return {
            ...n,
            config: { ...n.config, customParameters },
          };
        }
        return n;
      });

      const nextProject: ProjectConfig = { ...prev, nodes: updatedNodes };
      const simRes = runSimulation(nextProject);
      setSimulationResult(simRes);
      return nextProject;
    });
  }, []);

  // Update Parameter on Node
  const handleUpdateParameterOnNode = useCallback((nodeId: string, paramId: string, updated: Partial<CustomParameter>) => {
    setProject((prev) => {
      const updatedNodes = prev.nodes.map((n) => {
        if (n.id === nodeId) {
          const customParameters = (n.config.customParameters || []).map((p) =>
            p.id === paramId ? { ...p, ...updated } : p
          );
          return {
            ...n,
            config: { ...n.config, customParameters },
          };
        }
        return n;
      });

      const nextProject: ProjectConfig = { ...prev, nodes: updatedNodes };
      const simRes = runSimulation(nextProject);
      setSimulationResult(simRes);
      return nextProject;
    });
  }, []);

  // Delete Parameter from Node
  const handleDeleteParameterFromNode = useCallback((nodeId: string, paramId: string) => {
    setProject((prev) => {
      const updatedNodes = prev.nodes.map((n) => {
        if (n.id === nodeId) {
          const customParameters = (n.config.customParameters || []).filter((p) => p.id !== paramId);
          return {
            ...n,
            config: { ...n.config, customParameters },
          };
        }
        return n;
      });

      const nextProject: ProjectConfig = { ...prev, nodes: updatedNodes };
      const simRes = runSimulation(nextProject);
      setSimulationResult(simRes);
      return nextProject;
    });
  }, []);

  // Interface Handlers
  const handleSelectInterface = (id: string) => {
    setProject((prev) => ({
      ...prev,
      selectedInterfaceId: id,
      selectedNodeId: null,
      selectedConnectionId: null,
    }));
  };

  const handleUpdateInterface = (updated: InterfaceModel) => {
    setProject((prev) => ({
      ...prev,
      interfaces: prev.interfaces.map((i) => (i.id === updated.id ? updated : i)),
    }));
  };

  const handleSelectSample = (interfaceId: string, sampleId: string) => {
    setProject((prev) => ({
      ...prev,
      interfaces: prev.interfaces.map((i) =>
        i.id === interfaceId ? { ...i, activeSampleId: sampleId } : i
      ),
    }));
  };

  const handleDuplicateInterface = (id: string) => {
    const existing = project.interfaces.find((i) => i.id === id);
    if (!existing) return;
    const newId = `if-copy-${Date.now().toString().slice(-4)}`;
    const cloned: InterfaceModel = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
    };
    setProject((prev) => ({
      ...prev,
      interfaces: [...prev.interfaces, cloned],
      selectedInterfaceId: newId,
    }));
  };

  const handleDeleteInterface = (id: string) => {
    const existing = project.interfaces.find((i) => i.id === id);
    if (!existing) return;
    if (project.interfaces.length <= 1) {
      alert('Cannot delete the last interface in the workspace.');
      return;
    }
    const affectedNodes = project.nodes.filter((n) => n.interfaceId === id);
    const affectedNodeIds = affectedNodes.map((n) => n.id);
    const affectedConns = project.connections.filter(
      (c) => affectedNodeIds.includes(c.sourceNodeId) || affectedNodeIds.includes(c.targetNodeId)
    );

    const message = `Delete interface "${existing.name}"?\nThis will remove ${affectedNodes.length} bound node(s) and ${affectedConns.length} associated connection wire(s).`;
    if (window.confirm(message)) {
      setProject((prev) => ({
        ...prev,
        interfaces: prev.interfaces.filter((i) => i.id !== id),
        nodes: prev.nodes.filter((n) => n.interfaceId !== id),
        connections: prev.connections.filter(
          (c) => !affectedNodeIds.includes(c.sourceNodeId) && !affectedNodeIds.includes(c.targetNodeId)
        ),
        selectedInterfaceId: prev.selectedInterfaceId === id ? null : prev.selectedInterfaceId,
      }));
    }
  };

  const handleAddInterface = (newInterface: InterfaceModel) => {
    setProject((prev) => ({
      ...prev,
      interfaces: [...prev.interfaces, newInterface],
      selectedInterfaceId: newInterface.id,
    }));
  };

  const handleAddCanonicalParam = (newParam: CanonicalParameter) => {
    setProject((prev) => ({
      ...prev,
      canonicalParameters: [...prev.canonicalParameters, newParam],
    }));
  };

  const isLight = theme === 'light';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none transition-colors ${
      isLight ? 'bg-slate-100 text-slate-900 light' : 'bg-[#070b12] text-slate-100 dark'
    }`}>
      {/* 1. Top Bar */}
      <TopBar
        project={project}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRunSimulation={handleRunSimulation}
        onValidate={handleValidate}
        onOpenExport={() => setIsExportOpen(true)}
        onResetPreset={handleResetPreset}
        onAddInterface={() => setIsAddInterfaceOpen(true)}
        onAutoLayout={handleAutoLayout}
        diagnostics={diagnostics}
        isSimulating={isSimulating}
        showRibbon={showRibbon}
        onToggleRibbon={() => setShowRibbon(!showRibbon)}
        showProperties={showProperties}
        onToggleProperties={() => setShowProperties(!showProperties)}
        showBottomDock={showBottomDock}
        onToggleBottomDock={() => setShowBottomDock(!showBottomDock)}
      />

      {/* 2. Simultaneous Multi-Interface Overview Ribbon (Toggleable) */}
      {showRibbon && (
        <InterfaceRibbon
          interfaces={project.interfaces}
          selectedInterfaceId={project.selectedInterfaceId}
          theme={theme}
          onToggleHide={() => setShowRibbon(false)}
          onSelectInterface={handleSelectInterface}
          onSelectSample={handleSelectSample}
          onAddSample={(ifaceId) => {
            handleSelectInterface(ifaceId);
          }}
          onDuplicateInterface={handleDuplicateInterface}
          onDeleteInterface={handleDeleteInterface}
          onAddInterface={() => setIsAddInterfaceOpen(true)}
        />
      )}

      {/* 3. Central Workspace: Canvas + Contextual Properties Panel */}
      <div className="flex flex-1 min-h-0 relative">
        <DataFlowCanvas
          nodes={project.nodes}
          connections={project.connections}
          interfaces={project.interfaces}
          simulationResult={simulationResult}
          selectedNodeId={project.selectedNodeId}
          selectedConnectionId={project.selectedConnectionId}
          theme={theme}
          onSelectNode={(id) => {
            setProject((prev) => ({
              ...prev,
              selectedNodeId: id,
              selectedConnectionId: null,
              selectedInterfaceId: id
                ? prev.nodes.find((n) => n.id === id)?.interfaceId || prev.selectedInterfaceId
                : prev.selectedInterfaceId,
            }));
          }}
          onSelectConnection={(id) => {
            setProject((prev) => ({
              ...prev,
              selectedConnectionId: id,
              selectedNodeId: null,
            }));
          }}
          onUpdateNodePosition={handleUpdateNodePosition}
          onAddConnection={handleAddConnection}
          onDeleteConnection={handleDeleteConnection}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onAutoLayout={handleAutoLayout}
          onSendFromNode={handleSendFromNode}
          onAddParameterToNode={handleAddParameterToNode}
          onUpdateParameterOnNode={handleUpdateParameterOnNode}
          onDeleteParameterFromNode={handleDeleteParameterFromNode}
        />

        {/* Floating Button to Re-Open Properties Panel if collapsed */}
        {!showProperties && (
          <button
            onClick={() => setShowProperties(true)}
            title="Open Properties Panel"
            className={`absolute right-4 top-4 z-20 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border shadow-lg transition-all ${
              isLight 
                ? 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300' 
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700'
            }`}
          >
            <span>Show Properties</span>
          </button>
        )}

        {/* Floating Button to Re-Open Ribbon if collapsed */}
        {!showRibbon && (
          <button
            onClick={() => setShowRibbon(true)}
            title="Show Interface Overview Ribbon"
            className={`absolute left-4 bottom-4 z-20 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border shadow-lg transition-all ${
              isLight 
                ? 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300' 
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700'
            }`}
          >
            <span>Show Interface Ribbon</span>
          </button>
        )}

        {/* Right Sidebar Contextual Properties Inspector (Toggleable) */}
        {showProperties && (
          <PropertiesPanel
            project={project}
            selectedNodeId={project.selectedNodeId}
            selectedConnectionId={project.selectedConnectionId}
            selectedInterfaceId={project.selectedInterfaceId}
            theme={theme}
            onToggleHide={() => setShowProperties(false)}
            onClose={() => {
              setProject((prev) => ({
                ...prev,
                selectedNodeId: null,
                selectedConnectionId: null,
              }));
            }}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onUpdateConnection={handleUpdateConnection}
            onDeleteConnection={handleDeleteConnection}
            onUpdateInterface={handleUpdateInterface}
          />
        )}
      </div>

      {/* 4. Bottom Dock: Simulation Trace, Cross-Interface Diff, Canonical Dictionary, Diagnostics */}
      {showBottomDock && (
        <ExecutionTracePanel
          project={project}
          simulationResult={simulationResult}
          diagnostics={diagnostics}
          theme={theme}
          onSelectNode={(nodeId) => {
            setProject((prev) => ({
              ...prev,
              selectedNodeId: nodeId,
              selectedConnectionId: null,
            }));
          }}
          onAddCanonicalParam={handleAddCanonicalParam}
        />
      )}

      {/* 5. Modals */}
      <AddInterfaceModal
        isOpen={isAddInterfaceOpen}
        onClose={() => setIsAddInterfaceOpen(false)}
        onAdd={handleAddInterface}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
        simulationResult={simulationResult}
        onImportProject={(imported) => {
          setProject(imported);
          const res = runSimulation(imported);
          setSimulationResult(res);
        }}
      />
    </div>
  );
}
