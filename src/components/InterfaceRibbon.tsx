import React from 'react';
import { 
  Terminal, 
  Cpu, 
  Flame, 
  LayoutDashboard, 
  FileSpreadsheet, 
  FileCode, 
  Binary,
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  EyeOff
} from 'lucide-react';
import { InterfaceModel, InterfaceCategory } from '../types';

interface InterfaceRibbonProps {
  interfaces: InterfaceModel[];
  selectedInterfaceId: string | null;
  theme?: 'light' | 'dark';
  onToggleHide?: () => void;
  onSelectInterface: (id: string) => void;
  onSelectSample: (interfaceId: string, sampleId: string) => void;
  onAddSample: (interfaceId: string) => void;
  onDuplicateInterface: (id: string) => void;
  onDeleteInterface: (id: string) => void;
  onAddInterface: () => void;
}

export const InterfaceRibbon: React.FC<InterfaceRibbonProps> = ({
  interfaces,
  selectedInterfaceId,
  theme = 'light',
  onToggleHide,
  onSelectInterface,
  onSelectSample,
  onAddSample,
  onDuplicateInterface,
  onDeleteInterface,
  onAddInterface,
}) => {
  const isLight = theme === 'light';

  const getCategoryIcon = (category: InterfaceCategory) => {
    switch (category) {
      case 'uart_protocol':
        return <Terminal className="w-3.5 h-3.5" />;
      case 'hex_binary':
        return <Binary className="w-3.5 h-3.5" />;
      case 'json_stream':
        return <Cpu className="w-3.5 h-3.5" />;
      case 'firebase_rtdb':
        return <Flame className="w-3.5 h-3.5" />;
      case 'app_object':
        return <LayoutDashboard className="w-3.5 h-3.5" />;
      case 'csv_tabular':
        return <FileSpreadsheet className="w-3.5 h-3.5" />;
      default:
        return <FileCode className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className={`w-full border-b px-6 py-2.5 overflow-x-auto shrink-0 transition-colors ${
      isLight ? 'bg-slate-50/90 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Simultaneous Interface Overview
          </span>
          <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            · {interfaces.length} configured interfaces in pipeline
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddInterface}
            title="Add Custom Interface"
            className={`p-1.5 rounded-md border transition-colors flex items-center justify-center ${
              isLight ? 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' : 'bg-cyan-950 text-cyan-400 border-cyan-800 hover:bg-cyan-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Show / Hide Button on Ribbon Div (Icon-only) */}
          {onToggleHide && (
            <button
              onClick={onToggleHide}
              title="Hide Interface Overview Ribbon"
              className={`p-1.5 rounded-md transition-colors border flex items-center justify-center ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 shadow-2xs' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-stretch gap-3 min-w-max pb-1">
        {interfaces.map((iface, index) => {
          const isSelected = selectedInterfaceId === iface.id;
          const activeSample = iface.samples.find((s) => s.id === iface.activeSampleId) || iface.samples[0];
          const fieldCount = iface.confirmedSchema.fields.length;
          const matchedCount = iface.confirmedSchema.fields.filter((f) => f.canonicalParamId).length;
          const unmatchedCount = fieldCount - matchedCount;

          return (
            <div
              key={iface.id}
              onClick={() => onSelectInterface(iface.id)}
              className={`relative flex flex-col justify-between w-64 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                isSelected
                  ? isLight
                    ? 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                    : 'bg-slate-900 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/20'
                  : isLight
                    ? 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-2xs'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-3 right-3 h-[2px] rounded-t"
                style={{ backgroundColor: iface.colorTheme }}
              />

              {/* Header */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`p-1 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}
                      style={{ color: iface.colorTheme }}
                    >
                      {getCategoryIcon(iface.category)}
                    </span>
                    <span className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {iface.name.split(':')[0]}
                    </span>
                  </div>

                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                    isLight 
                      ? 'bg-slate-100 text-slate-600 border-slate-200' 
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/50'
                  }`}>
                    {iface.role}
                  </span>
                </div>

                <div className={`text-[11px] font-medium truncate mb-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  {iface.name.includes(':') ? iface.name.split(':')[1].trim() : iface.name}
                </div>

                <p className={`text-[10px] line-clamp-1 mb-2 font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  {iface.protocol}
                </p>
              </div>

              {/* Sample Selector & Stats */}
              <div className={`mt-2 pt-2 border-t ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Sample:</span>
                  <div className="relative group/sample">
                    <select
                      value={iface.activeSampleId}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectSample(iface.id, e.target.value);
                      }}
                      className={`text-[11px] font-mono rounded px-1.5 py-0.5 pr-4 appearance-none focus:outline-none focus:border-cyan-500 max-w-[130px] truncate border ${
                        isLight 
                          ? 'bg-white text-slate-800 border-slate-200 hover:border-slate-300' 
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {iface.samples.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`w-2.5 h-2.5 absolute right-1 top-1.5 pointer-events-none ${
                      isLight ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                  </div>
                </div>

                {/* Field Metrics Strip */}
                <div className={`flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded border ${
                  isLight 
                    ? 'bg-slate-50 text-slate-600 border-slate-200' 
                    : 'bg-slate-950/60 text-slate-400 border-slate-800/60'
                }`}>
                  <span title="Total detected schema fields">
                    <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{fieldCount}</strong> fields
                  </span>
                  <span className={isLight ? 'text-emerald-600' : 'text-emerald-400'} title="Fields bound to canonical parameters">
                    {matchedCount} matched
                  </span>
                  {unmatchedCount > 0 && (
                    <span className={isLight ? 'text-amber-600' : 'text-amber-400'} title="Fields without canonical mapping">
                      {unmatchedCount} unmapped
                    </span>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className={`flex items-center justify-between mt-2 pt-1.5 text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className={`truncate max-w-[120px] font-mono text-[9px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {activeSample?.format.toUpperCase()} · {activeSample?.rawPayload.length || 0} chars
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDuplicateInterface(iface.id)}
                      title="Duplicate interface configuration"
                      className={`p-1 transition-colors ${isLight ? 'hover:text-slate-800' : 'hover:text-slate-300'}`}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {interfaces.length > 1 && (
                      <button
                        onClick={() => onDeleteInterface(iface.id)}
                        title="Delete interface (with link check)"
                        className="p-1 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stage arrow indicator for consecutive linear preview */}
              {index < interfaces.length - 1 && (
                <div className={`hidden 2xl:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full border items-center justify-center pointer-events-none ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
