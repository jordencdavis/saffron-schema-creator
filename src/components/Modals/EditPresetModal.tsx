import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Sparkles, Binary, Tag, Hash, Cpu } from 'lucide-react';

export interface PresetParameter {
  id: string;
  name: string;
  value: number;
  unit?: string;
}

export interface SamplePreset {
  id: string;
  label: string;
  vpAddress: string;
  commandCode?: string;
  parameters: PresetParameter[];
  hex: string;
}

export function computeDwinHex(vpAddress: string, params: PresetParameter[]): string {
  const cleanVp = vpAddress.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '').padStart(4, '0').slice(0, 4).toUpperCase();
  const vpH = cleanVp.slice(0, 2);
  const vpL = cleanVp.slice(2, 4);

  const wordBytes: string[] = [];
  params.forEach((p) => {
    const num = Math.round(Number(p.value) || 0);
    const u16 = (num >= 0 ? num : (65536 + num)) & 0xFFFF;
    const hex = u16.toString(16).padStart(4, '0').toUpperCase();
    wordBytes.push(hex.slice(0, 2));
    wordBytes.push(hex.slice(2, 4));
  });

  if (wordBytes.length === 0) {
    wordBytes.push('00', '00');
  }

  const wordCount = (wordBytes.length / 2).toString(16).padStart(2, '0').toUpperCase();
  const dataLen = (3 + wordBytes.length).toString(16).padStart(2, '0').toUpperCase();

  return `5A A5 ${dataLen} 83 ${vpH} ${vpL} ${wordCount} ${wordBytes.join(' ')}`;
}

interface EditPresetModalProps {
  isOpen: boolean;
  preset: SamplePreset | null; // null if creating a new preset
  theme?: 'light' | 'dark';
  onClose: () => void;
  onSave: (preset: SamplePreset) => void;
  onDelete?: (presetId: string) => void;
}

export const EditPresetModal: React.FC<EditPresetModalProps> = ({
  isOpen,
  preset,
  theme = 'light',
  onClose,
  onSave,
  onDelete,
}) => {
  const isLight = theme === 'light';

  const [label, setLabel] = useState('');
  const [vpAddress, setVpAddress] = useState('0x5000');
  const [parameters, setParameters] = useState<PresetParameter[]>([]);
  const [customHexOverride, setCustomHexOverride] = useState<string | null>(null);

  useEffect(() => {
    if (preset) {
      setLabel(preset.label);
      setVpAddress(preset.vpAddress || '0x5000');
      setParameters(preset.parameters ? [...preset.parameters] : []);
      setCustomHexOverride(null);
    } else {
      // Default new preset
      setLabel('New Preset');
      setVpAddress('0x5000');
      setParameters([
        { id: `param-${Date.now()}`, name: 'sensor_value', value: 850, unit: 'ppm' }
      ]);
      setCustomHexOverride(null);
    }
  }, [preset, isOpen]);

  if (!isOpen) return null;

  // Auto-calculated hex based on VP Address and parameters
  const calculatedHex = customHexOverride !== null
    ? customHexOverride
    : computeDwinHex(vpAddress, parameters);

  const handleAddParameter = () => {
    const newId = `param-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setParameters((prev) => [
      ...prev,
      { id: newId, name: `param_${prev.length + 1}`, value: 100, unit: '' }
    ]);
  };

  const handleUpdateParameter = (id: string, updates: Partial<PresetParameter>) => {
    setParameters((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleRemoveParameter = (id: string) => {
    setParameters((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const savedPreset: SamplePreset = {
      id: preset?.id || `preset-${Date.now()}`,
      label: label.trim(),
      vpAddress: vpAddress.trim(),
      parameters,
      hex: calculatedHex,
    };

    onSave(savedPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-950 text-cyan-400'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {preset ? 'Edit Sample Preset' : 'Add Sample Preset'}
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Configure VP address, parameter names, and numerical values
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Preset Label */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Preset Name / Label *
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Normal Air Quality (850 ppm)"
              className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          {/* VP Address */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-xs font-semibold flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                Variable Pointer (VP) Address *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                16-bit Hex (e.g. 0x5000)
              </span>
            </div>
            <input
              type="text"
              required
              value={vpAddress}
              onChange={(e) => setVpAddress(e.target.value)}
              placeholder="0x5000"
              className={`w-full text-xs font-mono px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          {/* Parameters List: Add / Remove / Edit Individual Parameter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-semibold flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Parameters in Preset ({parameters.length})
              </label>
              <button
                type="button"
                onClick={handleAddParameter}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Parameter</span>
              </button>
            </div>

            {parameters.length === 0 ? (
              <div className={`p-4 rounded-lg border text-center text-xs italic ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                No parameters added yet. Click &quot;Add Parameter&quot; to include values in this preset.
              </div>
            ) : (
              <div className="space-y-2">
                {parameters.map((param, index) => (
                  <div
                    key={param.id}
                    className={`p-2.5 rounded-lg border flex flex-col gap-2 ${
                      isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                        Parameter #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParameter(param.id)}
                        title="Remove this parameter"
                        className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      {/* Name */}
                      <div className="col-span-6">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Name</label>
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) => handleUpdateParameter(param.id, { name: e.target.value })}
                          placeholder="e.g. co2_raw"
                          className={`w-full text-xs font-mono px-2 py-1.5 rounded border focus:outline-none focus:border-cyan-500 ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
                          }`}
                        />
                      </div>

                      {/* Numerical Value */}
                      <div className="col-span-4">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Value (Num)</label>
                        <input
                          type="number"
                          step="any"
                          value={param.value}
                          onChange={(e) => handleUpdateParameter(param.id, { value: parseFloat(e.target.value) || 0 })}
                          placeholder="850"
                          className={`w-full text-xs font-mono px-2 py-1.5 rounded border focus:outline-none focus:border-cyan-500 ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
                          }`}
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Unit</label>
                        <input
                          type="text"
                          value={param.unit || ''}
                          onChange={(e) => handleUpdateParameter(param.id, { unit: e.target.value })}
                          placeholder="ppm"
                          className={`w-full text-xs font-mono px-2 py-1.5 rounded border focus:outline-none focus:border-cyan-500 ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generated Hex Preview */}
          <div className={`p-3 rounded-lg border font-mono ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600 flex items-center gap-1">
                <Binary className="w-3 h-3" />
                Live Generated Hex Frame
              </span>
              <span className="text-[10px] text-slate-400">
                Auto-synced with VP & values
              </span>
            </div>
            <div className="text-xs font-bold text-cyan-700 dark:text-cyan-300 break-all select-all">
              {calculatedHex}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            {preset && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(preset.id);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Preset</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Preset</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
