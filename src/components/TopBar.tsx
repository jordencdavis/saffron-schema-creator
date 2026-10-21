import React from 'react';
import { Play, ShieldCheck, Download, RotateCcw, Plus, Layers, Network, AlertTriangle, Sun, Moon, PanelRightClose, PanelRightOpen, PanelBottomClose, PanelBottomOpen, Eye, EyeOff } from 'lucide-react';
import { ProjectConfig, ValidationDiagnostic } from '../types';

interface TopBarProps {
  project: ProjectConfig;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRunSimulation: () => void;
  onValidate: () => void;
  onOpenExport: () => void;
  onResetPreset: () => void;
  onAddInterface: () => void;
  onAutoLayout: () => void;
  diagnostics: ValidationDiagnostic[];
  isSimulating: boolean;
  showRibbon: boolean;
  onToggleRibbon: () => void;
  showProperties: boolean;
  onToggleProperties: () => void;
  showBottomDock?: boolean;
  onToggleBottomDock?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  theme,
  onToggleTheme,
  onRunSimulation,
  onValidate,
  onOpenExport,
  onResetPreset,
  onAddInterface,
  onAutoLayout,
  diagnostics,
  isSimulating,
  showRibbon,
  onToggleRibbon,
  showProperties,
  onToggleProperties,
  showBottomDock = true,
  onToggleBottomDock,
}) => {
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  const isLight = theme === 'light';

  return (
    <header className={`flex items-center justify-between gap-4 px-5 py-2.5 shrink-0 transition-colors ${
      isLight ? 'bg-white border-b border-slate-200' : 'bg-slate-900 border-b border-slate-800'
    }`}>
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          isLight 
            ? 'bg-cyan-50 border border-cyan-200 text-cyan-600' 
            : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
        }`}>
          <Network className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              FlowWeaver
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
              isLight 
                ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' 
                : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
            }`}>
              IoT Studio
            </span>
          </div>
          <p className={`text-[11px] truncate max-w-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Multi-Interface Visual Data Flow Designer & Analyzer
          </p>
        </div>
      </div>

      {/* Zone 2: Project & Version Meta */}
      <div className={`hidden lg:flex items-center gap-4 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <span className={`font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>FLOW:</span>
          <span className={`font-medium truncate max-w-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            {project.name}
          </span>
          <span className={`font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>({project.version})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>Interfaces:</span>
          <span className={`font-mono font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            {project.interfaces.length} active
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>Nodes:</span>
          <span className={`font-mono font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            {project.nodes.length}
          </span>
        </div>
      </div>

      {/* Zone 3: Primary Action Controls - Add button first, icon-only controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 1. Add Interface Button (First as requested, icon-only) */}
        <button
          onClick={onAddInterface}
          title="Add New Interface"
          className={`p-2 rounded-lg transition-all border flex items-center justify-center ${
            isLight
              ? 'bg-cyan-600 text-white border-cyan-700 hover:bg-cyan-700 shadow-xs'
              : 'bg-cyan-600 text-white border-cyan-500 hover:bg-cyan-500 shadow-xs'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* 2. Show / Hide Interface Overview Ribbon (Icon-only) */}
        <button
          onClick={onToggleRibbon}
          title={showRibbon ? 'Hide Interface Overview' : 'Show Interface Overview'}
          className={`p-2 rounded-lg transition-all border flex items-center justify-center ${
            showRibbon
              ? isLight
                ? 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100 shadow-2xs'
                : 'bg-cyan-950/80 text-cyan-400 border-cyan-800 hover:bg-cyan-900 shadow-2xs'
              : isLight
                ? 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
          }`}
        >
          {showRibbon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* 3. Show / Hide Properties Panel Button (Icon-only) */}
        <button
          onClick={onToggleProperties}
          title={showProperties ? 'Hide Properties Panel' : 'Show Properties Panel'}
          className={`p-2 rounded-lg transition-all border flex items-center justify-center ${
            showProperties
              ? isLight
                ? 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100 shadow-2xs'
                : 'bg-cyan-950/80 text-cyan-400 border-cyan-800 hover:bg-cyan-900 shadow-2xs'
              : isLight
                ? 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
          }`}
        >
          {showProperties ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>

        {/* 4. Show / Hide Bottom Execution Trace Dock (Icon-only) */}
        {onToggleBottomDock && (
          <button
            onClick={onToggleBottomDock}
            title={showBottomDock ? 'Hide Bottom Execution Trace Dock' : 'Show Bottom Execution Trace Dock'}
            className={`p-2 rounded-lg transition-all border flex items-center justify-center ${
              showBottomDock
                ? isLight
                  ? 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100 shadow-2xs'
                  : 'bg-cyan-950/80 text-cyan-400 border-cyan-800 hover:bg-cyan-900 shadow-2xs'
                : isLight
                  ? 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {showBottomDock ? <PanelBottomClose className="w-4 h-4" /> : <PanelBottomOpen className="w-4 h-4" />}
          </button>
        )}

        <div className={`h-4 w-[1px] mx-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* 4. Stage Align (Icon-only) */}
        <button
          onClick={onAutoLayout}
          title="Auto-arrange canvas into clean pipeline stages"
          className={`p-2 rounded-lg transition-colors border flex items-center justify-center ${
            isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* 5. Validate (Icon-only with status badge) */}
        <button
          onClick={onValidate}
          title={`Validate Flow: ${errorCount} errors, ${warningCount} warnings`}
          className={`p-2 rounded-lg transition-colors border relative flex items-center justify-center ${
            errorCount > 0
              ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
              : warningCount > 0
              ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
              : isLight
              ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
          }`}
        >
          {errorCount > 0 ? (
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          )}
          {(errorCount > 0 || warningCount > 0) && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white dark:border-slate-900" />
          )}
        </button>

        {/* 6. Run Simulation (Icon-only) */}
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          title={isSimulating ? 'Simulating data flow...' : 'Run Simulation'}
          className="p-2 text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center border border-cyan-500"
        >
          <Play className={`w-4 h-4 fill-current ${isSimulating ? 'animate-pulse' : ''}`} />
        </button>

        <div className={`h-4 w-[1px] mx-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* 7. Export (Icon-only) */}
        <button
          onClick={onOpenExport}
          title="Export Flow JSON, ESP32 C headers, Firebase Rules & Audit Report"
          className={`p-2 rounded-lg transition-colors border flex items-center justify-center ${
            isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
          }`}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* 8. Reset Preset (Icon-only) */}
        <button
          onClick={onResetPreset}
          title="Reset to default 5-interface IoT preset (CO2 telemetry)"
          className={`p-2 rounded-lg transition-colors border flex items-center justify-center ${
            isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* 9. Theme Toggle (Icon-only) */}
        <button
          onClick={onToggleTheme}
          title={isLight ? 'Switch to Dark Theme' : 'Switch to White Theme'}
          className={`p-2 rounded-lg transition-colors border flex items-center justify-center ${
            isLight
              ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-900 text-yellow-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </div>
    </header>
  );
};
