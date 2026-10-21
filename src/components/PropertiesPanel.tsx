import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Sparkles, 
  ArrowRight, 
  Settings2, 
  Binary, 
  Database, 
  ShieldCheck, 
  Layers,
  Sliders,
  CheckCircle2,
  FileCode,
  Tag
} from 'lucide-react';
import { 
  ProjectConfig, 
  FlowNode, 
  FlowConnection, 
  InterfaceModel, 
  CanonicalParameter, 
  TransformRule,
  DataType 
} from '../types';
import { inferSchemaFromSample, normalizeHex } from '../services/schemaInference';

interface PropertiesPanelProps {
  project: ProjectConfig;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  selectedInterfaceId: string | null;
  theme?: 'light' | 'dark';
  onToggleHide?: () => void;
  onClose: () => void;
  onUpdateNode: (node: FlowNode) => void;
  onDeleteNode: (id: string) => void;
  onUpdateConnection: (conn: FlowConnection) => void;
  onDeleteConnection: (id: string) => void;
  onUpdateInterface: (iface: InterfaceModel) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  project,
  selectedNodeId,
  selectedConnectionId,
  selectedInterfaceId,
  theme = 'light',
  onToggleHide,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onUpdateConnection,
  onDeleteConnection,
  onUpdateInterface,
}) => {
  const isLight = theme === 'light';
  const selectedNode = project.nodes.find((n) => n.id === selectedNodeId);
  const selectedConnection = project.connections.find((c) => c.id === selectedConnectionId);
  const selectedInterface = project.interfaces.find((i) => i.id === selectedInterfaceId);

  // Connection Mapping Helper
  const handleAddMapping = () => {
    if (!selectedConnection) return;
    const newMapping = {
      id: `map-${Date.now()}`,
      sourceField: '',
      targetField: '',
      transformRule: 'direct' as TransformRule,
      scaleMultiplier: 1.0,
      scaleOffset: 0,
    };
    onUpdateConnection({
      ...selectedConnection,
      mappings: [...(selectedConnection.mappings || []), newMapping],
    });
  };

  const handleUpdateMapping = (index: number, updates: Record<string, unknown>) => {
    if (!selectedConnection) return;
    const newMappings = [...selectedConnection.mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    onUpdateConnection({
      ...selectedConnection,
      mappings: newMappings,
    });
  };

  const handleDeleteMapping = (index: number) => {
    if (!selectedConnection) return;
    const newMappings = selectedConnection.mappings.filter((_, i) => i !== index);
    onUpdateConnection({
      ...selectedConnection,
      mappings: newMappings,
    });
  };

  // Re-run schema inference on active sample
  const handleReInferSchema = () => {
    if (!selectedInterface) return;
    const activeSample = selectedInterface.samples.find((s) => s.id === selectedInterface.activeSampleId);
    if (!activeSample) return;

    const newSchema = inferSchemaFromSample(activeSample.format, activeSample.rawPayload);
    onUpdateInterface({
      ...selectedInterface,
      inferredSchema: newSchema,
      confirmedSchema: newSchema,
    });
  };

  // Common Header Renderer
  const renderHeader = (icon: React.ReactNode, title: string) => (
    <div className={`flex items-center justify-between p-4 border-b shrink-0 transition-colors ${
      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
    }`}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {onToggleHide && (
          <button
            onClick={onToggleHide}
            title="Hide Properties Panel"
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-colors border ${
              isLight 
                ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 shadow-2xs' 
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
          >
            <span>Hide</span>
          </button>
        )}
        <button onClick={onClose} className={isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // 1. Connection Selected
  if (selectedConnection) {
    const srcNode = project.nodes.find((n) => n.id === selectedConnection.sourceNodeId);
    const tgtNode = project.nodes.find((n) => n.id === selectedConnection.targetNodeId);

    return (
      <aside className={`w-96 border-l flex flex-col h-full shrink-0 overflow-y-auto transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        {renderHeader(<Settings2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />, 'Connection Mapping Contract')}

        <div className="p-4 space-y-5">
          {/* Node Link Badge */}
          <div className={`p-3 rounded-lg border space-y-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <div className={`text-[10px] uppercase font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Processing Route</div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-cyan-600 dark:text-cyan-400 truncate max-w-[120px]">
                {srcNode?.title}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
              <span className="font-medium text-blue-600 dark:text-blue-400 truncate max-w-[120px]">
                {tgtNode?.title}
              </span>
            </div>
          </div>

          {/* Explicit Field Mappings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Explicit Field Transformations ({selectedConnection.mappings?.length || 0})
              </label>
              <button
                onClick={handleAddMapping}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>Add Field</span>
              </button>
            </div>

            <div className="space-y-3">
              {(!selectedConnection.mappings || selectedConnection.mappings.length === 0) && (
                <div className={`text-center py-6 text-xs border border-dashed rounded-lg ${
                  isLight ? 'text-slate-400 border-slate-200' : 'text-slate-500 border-slate-800'
                }`}>
                  No explicit mappings configured. Raw payload passes without transformation.
                </div>
              )}

              {selectedConnection.mappings?.map((map, index) => (
                <div key={map.id} className={`p-3 rounded-lg border space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Rule #{index + 1}</span>
                    <button
                      onClick={() => handleDeleteMapping(index)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Source Field</span>
                      <input
                        type="text"
                        value={map.sourceField}
                        onChange={(e) => handleUpdateMapping(index, { sourceField: e.target.value })}
                        placeholder="e.g. raw_data_word"
                        className={`w-full text-xs font-mono px-2 py-1 rounded border focus:outline-none focus:border-cyan-500 ${
                          isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                        }`}
                      />
                    </div>
                    <div>
                      <span className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Target Field</span>
                      <input
                        type="text"
                        value={map.targetField}
                        onChange={(e) => handleUpdateMapping(index, { targetField: e.target.value })}
                        placeholder="e.g. co2_raw"
                        className={`w-full text-xs font-mono px-2 py-1 rounded border focus:outline-none focus:border-cyan-500 ${
                          isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Transformation Rule</span>
                    <select
                      value={map.transformRule}
                      onChange={(e) => handleUpdateMapping(index, { transformRule: e.target.value as TransformRule })}
                      className={`w-full text-xs px-2 py-1 rounded border focus:outline-none focus:border-cyan-500 ${
                        isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                      }`}
                    >
                      <option value="direct">Direct Passthrough (1:1)</option>
                      <option value="rename">Rename Field Key</option>
                      <option value="scale">Numeric Scaling (ax + b)</option>
                      <option value="type_cast">Data Type Conversion</option>
                      <option value="custom_expr">Custom Format Expression</option>
                    </select>
                  </div>

                  {map.transformRule === 'scale' && (
                    <div className={`grid grid-cols-2 gap-2 text-xs p-2 rounded border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div>
                        <span className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Multiplier (a)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={map.scaleMultiplier ?? 1.0}
                          onChange={(e) => handleUpdateMapping(index, { scaleMultiplier: parseFloat(e.target.value) })}
                          className={`w-full text-xs font-mono px-2 py-1 rounded border ${
                            isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-700'
                          }`}
                        />
                      </div>
                      <div>
                        <span className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Offset (b)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={map.scaleOffset ?? 0}
                          onChange={(e) => handleUpdateMapping(index, { scaleOffset: parseFloat(e.target.value) })}
                          className={`w-full text-xs font-mono px-2 py-1 rounded border ${
                            isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-700'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {map.transformRule === 'type_cast' && (
                    <div>
                      <span className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Target Data Type</span>
                      <select
                        value={map.targetType || 'uint16'}
                        onChange={(e) => handleUpdateMapping(index, { targetType: e.target.value as DataType })}
                        className={`w-full text-xs px-2 py-1 rounded border ${
                          isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                        }`}
                      >
                        <option value="uint16">uint16 (Unsigned 16-bit)</option>
                        <option value="float">float (Single Precision)</option>
                        <option value="string">string (Text / ISO8601)</option>
                        <option value="timestamp">timestamp (Epoch seconds)</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={`pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              onClick={() => onDeleteConnection(selectedConnection.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Connection Wire</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 2. Node Selected
  if (selectedNode) {
    return (
      <aside className={`w-96 border-l flex flex-col h-full shrink-0 overflow-y-auto transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        {renderHeader(<Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />, 'Node Configuration')}

        <div className="p-4 space-y-4">
          <div>
            <label className={`text-[10px] uppercase font-mono block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Node Title
            </label>
            <input
              type="text"
              value={selectedNode.title}
              onChange={(e) => onUpdateNode({ ...selectedNode, title: e.target.value })}
              className={`w-full text-xs px-2.5 py-1.5 rounded border focus:outline-none focus:border-cyan-500 ${
                isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'
              }`}
            />
          </div>

          <div>
            <label className={`text-[10px] uppercase font-mono block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Subtitle / Protocol
            </label>
            <input
              type="text"
              value={selectedNode.subtitle || ''}
              onChange={(e) => onUpdateNode({ ...selectedNode, subtitle: e.target.value })}
              className={`w-full text-xs px-2.5 py-1.5 rounded border focus:outline-none focus:border-cyan-500 ${
                isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'
              }`}
            />
          </div>

          {/* Node Specific Config */}
          {selectedNode.type === 'hex_decoder' && (
            <div className={`p-3 rounded-lg border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                UART Frame Decoding Parameters
              </div>
              <div>
                <label className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Frame Sync Header (HEX)
                </label>
                <input
                  type="text"
                  value={selectedNode.config.frameHeader || '5AA5'}
                  onChange={(e) =>
                    onUpdateNode({
                      ...selectedNode,
                      config: { ...selectedNode.config, frameHeader: e.target.value },
                    })
                  }
                  className={`w-full text-xs font-mono px-2 py-1 rounded border ${
                    isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Target VP Address
                </label>
                <input
                  type="text"
                  value={selectedNode.config.vpAddress || '0x5000'}
                  onChange={(e) =>
                    onUpdateNode({
                      ...selectedNode,
                      config: { ...selectedNode.config, vpAddress: e.target.value },
                    })
                  }
                  className={`w-full text-xs font-mono px-2 py-1 rounded border ${
                    isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Endianness
                </label>
                <select
                  value={selectedNode.config.endianness || 'big'}
                  onChange={(e) =>
                    onUpdateNode({
                      ...selectedNode,
                      config: { ...selectedNode.config, endianness: e.target.value as 'big' | 'little' },
                    })
                  }
                  className={`w-full text-xs px-2 py-1 rounded border ${
                    isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                  }`}
                >
                  <option value="big">Big Endian (Standard DWIN DGUS)</option>
                  <option value="little">Little Endian</option>
                </select>
              </div>
            </div>
          )}

          {selectedNode.type === 'enricher' && (
            <div className={`p-3 rounded-lg border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Firmware Metadata Enrichment
              </div>
              <div>
                <label className={`text-[10px] block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Attached Device ID
                </label>
                <input
                  type="text"
                  value={selectedNode.config.addedDeviceId || 'ESP32-S3-LAB-01'}
                  onChange={(e) =>
                    onUpdateNode({
                      ...selectedNode,
                      config: { ...selectedNode.config, addedDeviceId: e.target.value },
                    })
                  }
                  className={`w-full text-xs font-mono px-2 py-1 rounded border ${
                    isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addTime"
                  checked={selectedNode.config.addTimestamp ?? true}
                  onChange={(e) =>
                    onUpdateNode({
                      ...selectedNode,
                      config: { ...selectedNode.config, addTimestamp: e.target.checked },
                    })
                  }
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="addTime" className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Append Ingestion Receive Timestamp
                </label>
              </div>
            </div>
          )}

          <div className={`pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              onClick={() => onDeleteNode(selectedNode.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Node</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 3. Interface Selected
  if (selectedInterface) {
    const activeSample = selectedInterface.samples.find((s) => s.id === selectedInterface.activeSampleId);
    const hexBytes = activeSample?.format === 'hex' ? normalizeHex(activeSample.rawPayload) : [];

    return (
      <aside className={`w-96 border-l flex flex-col h-full shrink-0 overflow-y-auto transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        {renderHeader(<Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />, 'Interface Inspector')}

        <div className="p-4 space-y-5">
          {/* Interface Meta */}
          <div className="space-y-3">
            <div>
              <label className={`text-[10px] uppercase font-mono block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Interface Name
              </label>
              <input
                type="text"
                value={selectedInterface.name}
                onChange={(e) => onUpdateInterface({ ...selectedInterface, name: e.target.value })}
                className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded border focus:outline-none focus:border-cyan-500 ${
                  isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className={`text-[10px] uppercase font-mono block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Protocol / Format
                </label>
                <input
                  type="text"
                  value={selectedInterface.protocol}
                  onChange={(e) => onUpdateInterface({ ...selectedInterface, protocol: e.target.value })}
                  className={`w-full text-xs font-mono px-2 py-1.5 rounded border ${
                    isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[10px] uppercase font-mono block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Role
                </label>
                <select
                  value={selectedInterface.role}
                  onChange={(e) => onUpdateInterface({ ...selectedInterface, role: e.target.value as any })}
                  className={`w-full text-xs px-2 py-1.5 rounded border ${
                    isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'
                  }`}
                >
                  <option value="input">Input (Source)</option>
                  <option value="output">Output (Sink)</option>
                  <option value="bidirectional">Bidirectional</option>
                </select>
              </div>
            </div>

            <div>
              <label className={`text-[10px] uppercase font-mono block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Description
              </label>
              <textarea
                rows={2}
                value={selectedInterface.description}
                onChange={(e) => onUpdateInterface({ ...selectedInterface, description: e.target.value })}
                className={`w-full text-xs p-2 rounded border focus:outline-none focus:border-cyan-500 resize-none ${
                  isLight ? 'bg-slate-50 text-slate-800 border-slate-300' : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              />
            </div>
          </div>

          {/* Representative Sample Input Editor */}
          <div className={`p-3 rounded-lg border space-y-2.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                Representative Data Input
              </span>
              <button
                onClick={handleReInferSchema}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Detect Schema</span>
              </button>
            </div>

            {activeSample && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{activeSample.name}</span>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                    isLight ? 'bg-white text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}>
                    {activeSample.format} · {activeSample.rawPayload.length} chars
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={activeSample.rawPayload}
                  onChange={(e) => {
                    const newSamples = selectedInterface.samples.map((s) =>
                      s.id === activeSample.id ? { ...s, rawPayload: e.target.value } : s
                    );
                    onUpdateInterface({ ...selectedInterface, samples: newSamples });
                  }}
                  className={`w-full text-xs font-mono p-2 rounded border focus:outline-none focus:border-cyan-500 ${
                    isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-200 border-slate-700'
                  }`}
                />

                {/* Hex Byte Inspector Preview if hex */}
                {activeSample.format === 'hex' && hexBytes.length > 0 && (
                  <div className={`p-2 rounded border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
                  }`}>
                    <div className="text-[10px] font-mono mb-1 flex items-center justify-between">
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Byte Offsets ({hexBytes.length} bytes):</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">DWIN T5L Framing</span>
                    </div>
                    <div className="flex flex-wrap gap-1 font-mono text-xs">
                      {hexBytes.map((byte, idx) => {
                        let color = isLight ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-slate-800 text-slate-300';
                        if (idx < 2) color = isLight ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 font-bold' : 'bg-cyan-950 text-cyan-300 border border-cyan-800';
                        else if (idx === 2) color = isLight ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-purple-950 text-purple-300';
                        else if (idx === 3) color = isLight ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-blue-950 text-blue-300';
                        else if (idx === 4 || idx === 5) color = isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-950 text-amber-300';
                        else if (idx >= 7) color = isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold' : 'bg-emerald-950 text-emerald-300 border border-emerald-800';

                        return (
                          <span
                            key={idx}
                            title={`Offset 0x${idx.toString(16)}: ${byte}`}
                            className={`px-1.5 py-0.5 rounded text-[11px] ${color}`}
                          >
                            {byte}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detected / Confirmed Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                Interface Schema Fields ({selectedInterface.confirmedSchema.fields.length})
              </span>
              <span className={`text-[10px] font-mono flex items-center gap-1 ${
                isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                <span>Confirmed</span>
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {selectedInterface.confirmedSchema.fields.map((field) => (
                <div key={field.id} className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{field.name}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                      isLight ? 'bg-white text-cyan-800 border-slate-200' : 'bg-slate-900 text-cyan-400 border-slate-800'
                    }`}>
                      {field.dataType} {field.unit ? `(${field.unit})` : ''}
                    </span>
                  </div>

                  <div className={`text-[10px] font-mono truncate ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    Path: {field.path}
                  </div>

                  {field.canonicalParamId && (
                    <div className={`flex items-center gap-1 text-[10px] font-mono mt-1 pt-1 border-t ${
                      isLight ? 'text-emerald-700 border-slate-200' : 'text-emerald-400 border-slate-800/80'
                    }`}>
                      <Tag className="w-3 h-3" />
                      <span>Bound to canonical: {field.canonicalParamId}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 4. Default / Nothing Selected: Quick System Overview
  return (
    <aside className={`w-96 border-l flex flex-col h-full shrink-0 overflow-y-auto transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
    }`}>
      {renderHeader(<Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />, 'Workspace Inspector')}

      <div className="p-5 space-y-5">
        <div>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Select an interface card, canvas node, or connection wire to inspect its mapping and lineage rules.
          </p>
        </div>

        <div className={`p-4 rounded-lg border space-y-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <span className={`text-xs font-semibold block ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
            End-to-End System Snapshot
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`p-2.5 rounded border ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <span className={`text-[10px] block font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>INTERFACES</span>
              <span className={`text-base font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{project.interfaces.length}</span>
            </div>
            <div className={`p-2.5 rounded border ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <span className={`text-[10px] block font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>CANONICAL PARAMS</span>
              <span className={`text-base font-bold font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{project.canonicalParameters.length}</span>
            </div>
            <div className={`p-2.5 rounded border ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <span className={`text-[10px] block font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>FLOW NODES</span>
              <span className={`text-base font-bold font-mono ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`}>{project.nodes.length}</span>
            </div>
            <div className={`p-2.5 rounded border ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <span className={`text-[10px] block font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>WIRED CONTRACTS</span>
              <span className={`text-base font-bold font-mono ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{project.connections.length}</span>
            </div>
          </div>
        </div>

        <div className={`p-3.5 rounded-lg border text-xs space-y-2 ${
          isLight ? 'bg-cyan-50/60 border-cyan-200 text-slate-800' : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <span className="font-semibold block text-cyan-800 dark:text-cyan-300">Key Parameter: Climate CO₂</span>
          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            The parameter <code className="font-bold text-cyan-700 dark:text-cyan-400">climate.co2</code> is currently traced from DWIN DGUS UART bytes (VP <code className="font-mono">0x5000</code>) into ESP32 firmware structs, through Firebase RTDB paths, and rendered onto the client GUI.
          </p>
        </div>
      </div>
    </aside>
  );
};
