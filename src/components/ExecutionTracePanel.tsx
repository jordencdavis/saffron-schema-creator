import React, { useState } from 'react';
import { 
  Play, 
  Layers, 
  Split, 
  BookOpen, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  ArrowRight,
  Maximize2,
  Minimize2,
  Plus,
  Tag
} from 'lucide-react';
import { 
  SimulationResult, 
  ProjectConfig, 
  ValidationDiagnostic, 
  CanonicalParameter, 
  FieldComparisonResult 
} from '../types';
import { compareFields } from '../services/schemaInference';

interface ExecutionTracePanelProps {
  project: ProjectConfig;
  simulationResult: SimulationResult | null;
  diagnostics: ValidationDiagnostic[];
  theme?: 'light' | 'dark';
  onSelectNode: (nodeId: string) => void;
  onAddCanonicalParam: (param: CanonicalParameter) => void;
}

export const ExecutionTracePanel: React.FC<ExecutionTracePanelProps> = ({
  project,
  simulationResult,
  diagnostics,
  theme = 'light',
  onSelectNode,
  onAddCanonicalParam,
}) => {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'trace' | 'diff' | 'dictionary' | 'diagnostics'>('trace');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  // Cross-interface comparison selectors
  const [sourceInterfaceId, setSourceInterfaceId] = useState<string>(project.interfaces[0]?.id || '');
  const [targetInterfaceId, setTargetInterfaceId] = useState<string>(project.interfaces[2]?.id || '');

  // Filter diagnostics
  const [diagnosticFilter, setDiagnosticFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  // Compute Cross-Interface comparison matrix
  const srcIface = project.interfaces.find((i) => i.id === sourceInterfaceId) || project.interfaces[0];
  const tgtIface = project.interfaces.find((i) => i.id === targetInterfaceId) || project.interfaces[1];

  const fieldComparisons: FieldComparisonResult[] = [];
  if (srcIface && tgtIface) {
    srcIface.confirmedSchema.fields.forEach((sf) => {
      // Find best match in target
      let bestMatch: FieldComparisonResult | null = null;
      tgtIface.confirmedSchema.fields.forEach((tf) => {
        const result = compareFields(sf, tf, project.canonicalParameters);
        if (!bestMatch || result.confidence > bestMatch.confidence) {
          bestMatch = {
            ...result,
            sourceInterfaceId: srcIface.id,
            targetInterfaceId: tgtIface.id,
          };
        }
      });
      if (bestMatch) {
        fieldComparisons.push(bestMatch);
      }
    });
  }

  return (
    <div
      className={`w-full border-t flex flex-col shrink-0 transition-all ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
      } ${!isExpanded ? 'h-10' : isMaximized ? 'h-[520px]' : 'h-72'}`}
    >
      {/* Dock Header & Tabs */}
      <div className={`flex items-center justify-between px-6 border-b h-10 shrink-0 transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab('trace');
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
              activeTab === 'trace' && isExpanded
                ? isLight
                  ? 'text-cyan-700 border-cyan-600 bg-white font-semibold shadow-2xs'
                  : 'text-cyan-400 border-cyan-400 bg-slate-950/60'
                : isLight
                ? 'text-slate-500 border-transparent hover:text-slate-800'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulation Trace & Diff</span>
            {simulationResult && (
              <span className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {simulationResult.totalDurationMs}ms
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('diff');
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
              activeTab === 'diff' && isExpanded
                ? isLight
                  ? 'text-cyan-700 border-cyan-600 bg-white font-semibold shadow-2xs'
                  : 'text-cyan-400 border-cyan-400 bg-slate-950/60'
                : isLight
                ? 'text-slate-500 border-transparent hover:text-slate-800'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Cross-Interface Field Comparison</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('dictionary');
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
              activeTab === 'dictionary' && isExpanded
                ? isLight
                  ? 'text-cyan-700 border-cyan-600 bg-white font-semibold shadow-2xs'
                  : 'text-cyan-400 border-cyan-400 bg-slate-950/60'
                : isLight
                ? 'text-slate-500 border-transparent hover:text-slate-800'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Canonical Data Dictionary ({project.canonicalParameters.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('diagnostics');
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
              activeTab === 'diagnostics' && isExpanded
                ? isLight
                  ? 'text-cyan-700 border-cyan-600 bg-white font-semibold shadow-2xs'
                  : 'text-cyan-400 border-cyan-400 bg-slate-950/60'
                : isLight
                ? 'text-slate-500 border-transparent hover:text-slate-800'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Validation Diagnostics</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span
                className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  errorCount > 0 
                    ? isLight ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-rose-950 text-rose-300' 
                    : isLight ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-amber-950 text-amber-300'
                }`}
              >
                {errorCount > 0 ? `${errorCount}E` : `${warningCount}W`}
              </span>
            )}
          </button>
        </div>

        {/* Dock Sizing Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className={`p-1 rounded ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title={isMaximized ? 'Restore dock height' : 'Maximize dock'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title={isExpanded ? 'Collapse dock' : 'Expand dock'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      {isExpanded && (
        <div className={`flex-1 overflow-y-auto p-4 transition-colors ${isLight ? 'bg-slate-50/50' : 'bg-[#080c14]'}`}>
          {/* TAB 1: Simulation Trace & Diff */}
          {activeTab === 'trace' && (
            <div className="space-y-4">
              {!simulationResult ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Simulation has not been executed yet. Click &quot;Run Simulation&quot; in the top bar to trace data across all 5 interfaces.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`flex items-center justify-between px-4 py-2 rounded-lg border text-xs ${
                    isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Execution Complete: {simulationResult.status.toUpperCase()}</span>
                      </span>
                      <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                        (Total Duration: {simulationResult.totalDurationMs} ms)
                      </span>
                    </div>
                    <span className={`font-mono text-[11px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                      Trace ID: {simulationResult.id}
                    </span>
                  </div>

                  {/* Step-by-Step Node Execution Diff Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(simulationResult.traces).map((trace) => (
                      <div
                        key={trace.nodeId}
                        onClick={() => onSelectNode(trace.nodeId)}
                        className={`rounded-lg border p-3 cursor-pointer text-xs space-y-2 transition-all ${
                          isLight 
                            ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs' 
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold truncate max-w-[160px] ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                            {trace.nodeTitle}
                          </span>
                          <span className={`font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                            {trace.durationMs}ms
                          </span>
                        </div>

                        {/* Diff Breakdown Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                          {trace.fieldsPreserved.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded border ${
                              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              ={trace.fieldsPreserved.length} preserved
                            </span>
                          )}
                          {trace.fieldsAdded.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded border ${
                              isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                            }`}>
                              +{trace.fieldsAdded.length} added
                            </span>
                          )}
                          {trace.fieldsModified.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded border ${
                              isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950 text-amber-400 border-amber-800/60'
                            }`}>
                              ~{trace.fieldsModified.length} changed
                            </span>
                          )}
                          {trace.fieldsOmitted.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded border ${
                              isLight ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-rose-950 text-rose-400 border-rose-800/60'
                            }`}>
                              -{trace.fieldsOmitted.length} dropped
                            </span>
                          )}
                        </div>

                        {/* Payload Preview */}
                        <div className={`p-2 rounded border font-mono text-[11px] max-h-24 overflow-y-auto ${
                          isLight ? 'bg-slate-50 text-slate-800 border-slate-200' : 'bg-slate-950 text-slate-300 border-slate-800/80'
                        }`}>
                          <pre className="whitespace-pre-wrap break-all">
                            {JSON.stringify(trace.outputPayload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Cross-Interface Field Comparison */}
          {activeTab === 'diff' && (
            <div className="space-y-4">
              {/* Interface Selectors */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border text-xs ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
              }`}>
                <span className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Compare Source Interface:</span>
                <select
                  value={sourceInterfaceId}
                  onChange={(e) => setSourceInterfaceId(e.target.value)}
                  className={`px-2.5 py-1 rounded border ${
                    isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-700'
                  }`}
                >
                  {project.interfaces.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>

                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />

                <span className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Destination Interface:</span>
                <select
                  value={targetInterfaceId}
                  onChange={(e) => setTargetInterfaceId(e.target.value)}
                  className={`px-2.5 py-1 rounded border ${
                    isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-700'
                  }`}
                >
                  {project.interfaces.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comparison Table */}
              <div className={`overflow-x-auto rounded-lg border ${isLight ? 'bg-white border-slate-200 shadow-2xs' : 'border-slate-800'}`}>
                <table className="w-full text-xs text-left">
                  <thead className={`text-[11px] uppercase font-mono border-b ${
                    isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    <tr>
                      <th className="px-4 py-2.5">Source Field ({srcIface?.name.split(':')[0]})</th>
                      <th className="px-4 py-2.5">Target Field ({tgtIface?.name.split(':')[0]})</th>
                      <th className="px-4 py-2.5">Match Category</th>
                      <th className="px-4 py-2.5">Confidence</th>
                      <th className="px-4 py-2.5">Analysis & Reason</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isLight ? 'divide-slate-100 bg-white' : 'divide-slate-800/80 bg-slate-950/40'
                  }`}>
                    {fieldComparisons.map((item, idx) => (
                      <tr key={idx} className={isLight ? 'hover:bg-slate-50 transition-colors' : 'hover:bg-slate-900/60 transition-colors'}>
                        <td className={`px-4 py-2.5 font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                          {item.sourceField.name}{' '}
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>({item.sourceField.dataType})</span>
                        </td>
                        <td className={`px-4 py-2.5 font-mono ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          {item.targetField ? (
                            <>
                              {item.targetField.name}{' '}
                              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>({item.targetField.dataType})</span>
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                              item.category === 'exact_match'
                                ? isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                : item.category === 'renamed_match'
                                ? isLight ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                : item.category === 'type_conversion_match'
                                ? isLight ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                : item.category === 'scaling_match'
                                ? isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                : isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            {item.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 font-mono font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          {Math.round(item.confidence * 100)}%
                        </td>
                        <td className={`px-4 py-2.5 text-[11px] max-w-md ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {item.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Canonical Data Dictionary */}
          {activeTab === 'dictionary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Shared semantic parameters anchoring disparate interface field names into common ground-truth values.
                </p>
                <button
                  onClick={() => {
                    const newId = `custom.param_${Date.now().toString().slice(-4)}`;
                    onAddCanonicalParam({
                      id: newId,
                      name: 'Custom Parameter',
                      description: 'User registered telemetry channel',
                      dataType: 'float',
                      standardUnit: 'units',
                      knownBindings: [],
                    });
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
                    isLight 
                      ? 'text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100' 
                      : 'text-cyan-400 bg-cyan-950/60 border-cyan-800 hover:bg-cyan-900/60'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Parameter</span>
                </button>
              </div>

              <div className={`overflow-x-auto rounded-lg border ${isLight ? 'bg-white border-slate-200 shadow-2xs' : 'border-slate-800'}`}>
                <table className="w-full text-xs text-left">
                  <thead className={`text-[11px] uppercase font-mono border-b ${
                    isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    <tr>
                      <th className="px-4 py-2.5">Parameter ID</th>
                      <th className="px-4 py-2.5">Display Name & Description</th>
                      <th className="px-4 py-2.5">Standard Unit</th>
                      <th className="px-4 py-2.5">Valid Range</th>
                      <th className="px-4 py-2.5">Active Interface Bindings</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isLight ? 'divide-slate-100 bg-white' : 'divide-slate-800/80 bg-slate-950/40'
                  }`}>
                    {project.canonicalParameters.map((param) => (
                      <tr key={param.id} className={isLight ? 'hover:bg-slate-50 transition-colors' : 'hover:bg-slate-900/60 transition-colors'}>
                        <td className={`px-4 py-3 font-mono font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>{param.id}</td>
                        <td className="px-4 py-3">
                          <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{param.name}</div>
                          <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{param.description}</div>
                        </td>
                        <td className={`px-4 py-3 font-mono ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{param.standardUnit}</td>
                        <td className={`px-4 py-3 font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {param.validRange ? `[${param.validRange[0]}, ${param.validRange[1]}]` : 'Any'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {param.knownBindings.map((b, i) => (
                              <span
                                key={i}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {b.interfaceId.replace('if-', '')}: {b.fieldPath.split('.').pop()}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Validation Diagnostics */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              {/* Filter Strip */}
              <div className="flex items-center gap-2 text-xs">
                <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>Filter by severity:</span>
                <button
                  onClick={() => setDiagnosticFilter('all')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    diagnosticFilter === 'all' 
                      ? isLight ? 'bg-slate-900 text-white font-medium' : 'bg-slate-800 text-white font-medium'
                      : isLight ? 'text-slate-600 hover:text-slate-900 bg-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({diagnostics.length})
                </button>
                <button
                  onClick={() => setDiagnosticFilter('error')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    diagnosticFilter === 'error' 
                      ? isLight ? 'bg-rose-600 text-white font-medium' : 'bg-rose-950 text-rose-300' 
                      : isLight ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  Errors ({errorCount})
                </button>
                <button
                  onClick={() => setDiagnosticFilter('warning')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    diagnosticFilter === 'warning' 
                      ? isLight ? 'bg-amber-600 text-white font-medium' : 'bg-amber-950 text-amber-300' 
                      : isLight ? 'text-amber-700 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-400'
                  }`}
                >
                  Warnings ({warningCount})
                </button>
              </div>

              {/* Diagnostics List */}
              <div className="space-y-2">
                {diagnostics
                  .filter((d) => diagnosticFilter === 'all' || d.severity === diagnosticFilter)
                  .map((diag) => (
                    <div
                      key={diag.id}
                      className={`p-3 rounded-lg border text-xs flex items-start gap-3 shadow-2xs ${
                        diag.severity === 'error'
                          ? isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/30 border-rose-900/60 text-rose-200'
                          : diag.severity === 'warning'
                          ? isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-900/60 text-amber-200'
                          : isLight ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-blue-950/30 border-blue-900/60 text-blue-200'
                      }`}
                    >
                      <div className="mt-0.5">
                        {diag.severity === 'error' ? (
                          <ShieldAlert className="w-4 h-4 text-rose-500" />
                        ) : diag.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{diag.title}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isLight ? 'bg-white text-slate-600 border-slate-200' : 'bg-black/40 text-slate-400 border-slate-700'
                          }`}>
                            Tier: {diag.tier.toUpperCase()} · {diag.targetName}
                          </span>
                        </div>
                        <p className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{diag.description}</p>
                        {diag.suggestedCorrection && (
                          <p className={`text-[11px] font-mono mt-1 ${isLight ? 'text-cyan-800' : 'text-cyan-400'}`}>
                            Recommendation: {diag.suggestedCorrection}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                {diagnostics.length === 0 && (
                  <div className="text-center py-8 text-emerald-600 text-xs flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>All 4 validation tiers passed. Zero errors detected.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
