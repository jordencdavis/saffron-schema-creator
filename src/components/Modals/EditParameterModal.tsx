import React, { useState } from 'react';
import { X, Check, Trash2, Tag, Hash, FileText } from 'lucide-react';
import { CustomParameter, DataType } from '../../types';

interface EditParameterModalProps {
  isOpen: boolean;
  theme?: 'light' | 'dark';
  nodeTitle: string;
  parameter?: CustomParameter | null; // null if adding new
  onClose: () => void;
  onSave: (param: Omit<CustomParameter, 'id'>) => void;
  onDelete?: () => void;
}

const DATA_TYPES: { type: DataType; label: string }[] = [
  { type: 'uint16', label: 'uint16 (Unsigned 16-bit Int)' },
  { type: 'uint8', label: 'uint8 (Unsigned Byte)' },
  { type: 'uint32', label: 'uint32 (Unsigned 32-bit Int)' },
  { type: 'int16', label: 'int16 (Signed 16-bit Int)' },
  { type: 'int32', label: 'int32 (Signed 32-bit Int)' },
  { type: 'float', label: 'float (Decimal Number)' },
  { type: 'string', label: 'string (Text)' },
  { type: 'boolean', label: 'boolean (true / false)' },
  { type: 'timestamp', label: 'timestamp (Unix / ISO)' },
  { type: 'bytes', label: 'bytes (Hex String)' },
  { type: 'object', label: 'object (Structured JSON)' },
];

export const EditParameterModal: React.FC<EditParameterModalProps> = ({
  isOpen,
  theme = 'light',
  nodeTitle,
  parameter,
  onClose,
  onSave,
  onDelete,
}) => {
  const isLight = theme === 'light';

  const [name, setName] = useState(parameter?.name || '');
  const [type, setType] = useState<DataType>(parameter?.type || 'uint16');
  const [value, setValue] = useState(
    parameter?.value !== undefined ? String(parameter.value) : '850'
  );
  const [unit, setUnit] = useState(parameter?.unit || '');
  const [description, setDescription] = useState(parameter?.description || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Parameter name is required');
      return;
    }

    // Convert value according to type
    let parsedValue: unknown = value;
    if (type === 'uint8' || type === 'uint16' || type === 'uint32' || type === 'int16' || type === 'int32') {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        setError(`Value must be a valid integer for ${type}`);
        return;
      }
      parsedValue = num;
    } else if (type === 'float') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        setError('Value must be a valid decimal number for float');
        return;
      }
      parsedValue = num;
    } else if (type === 'boolean') {
      parsedValue = value.toLowerCase() === 'true' || value === '1';
    }

    onSave({
      name: name.trim(),
      type,
      value: parsedValue,
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-md rounded-xl border shadow-2xl transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isLight ? 'border-slate-100' : 'border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-md ${isLight ? 'bg-cyan-50 text-cyan-600' : 'bg-cyan-950 text-cyan-400'}`}>
              <Tag className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">
                {parameter ? 'Edit Parameter' : 'Add Parameter to Node'}
              </h2>
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Node: {nodeTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="text-xs px-3 py-2 rounded bg-rose-50 text-rose-600 border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Parameter Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. co2_raw, ambient_temp, device_id"
                className={`w-full text-xs px-3 py-2 rounded-lg border font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Data Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DataType)}
                className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              >
                {DATA_TYPES.map((dt) => (
                  <option key={dt.type} value={dt.type}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Unit (Optional)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. ppm, °C, s, mV"
                className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Default / Output Value <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 850, 24.5, ESP32-S3-LAB-01"
              className={`w-full text-xs px-3 py-2 rounded-lg border font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
              }`}
            />
            <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              Value added/emitted by this node and propagated downstream to connected receivers.
            </p>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Sensor reading from onboard hardware"
              className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className={`flex items-center justify-between pt-3 border-t ${
            isLight ? 'border-slate-100' : 'border-slate-800'
          }`}>
            {parameter && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete parameter "${parameter.name}" from this node?`)) {
                    onDelete();
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  isLight ? 'text-slate-600 border-slate-300 hover:bg-slate-100' : 'text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{parameter ? 'Save Changes' : 'Add Parameter'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
