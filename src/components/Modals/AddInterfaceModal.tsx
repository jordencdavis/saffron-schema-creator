import React, { useState } from 'react';
import { X, Plus, Terminal, Cpu, Flame, LayoutDashboard, FileSpreadsheet, Binary } from 'lucide-react';
import { InterfaceModel, InterfaceCategory, InterfaceRole } from '../../types';
import { inferSchemaFromSample } from '../../services/schemaInference';

interface AddInterfaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newInterface: InterfaceModel) => void;
}

export const AddInterfaceModal: React.FC<AddInterfaceModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InterfaceCategory>('json_stream');
  const [role, setRole] = useState<InterfaceRole>('bidirectional');
  const [protocol, setProtocol] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [description, setDescription] = useState('');
  const [samplePayload, setSamplePayload] = useState('');
  const [sampleFormat, setSampleFormat] = useState<'hex' | 'json' | 'csv' | 'text'>('json');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ifaceId = `if-custom-${Date.now().toString().slice(-4)}`;
    const sampleId = `sample-${Date.now().toString().slice(-4)}`;

    const initialPayload = samplePayload.trim() || (sampleFormat === 'json' ? '{"status": "ok"}' : '5AA504835000');
    const inferred = inferSchemaFromSample(sampleFormat, initialPayload);

    const colors = ['#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newInterface: InterfaceModel = {
      id: ifaceId,
      name: name.trim() || `Custom Interface ${Date.now().toString().slice(-3)}`,
      category,
      role,
      protocol: protocol.trim() || 'Custom Protocol',
      description: description.trim() || 'User configured interface',
      deviceId: deviceId.trim() || undefined,
      colorTheme: randomColor,
      isEnabled: true,
      activeSampleId: sampleId,
      samples: [
        {
          id: sampleId,
          name: 'Initial Representative Sample',
          format: sampleFormat,
          rawPayload: initialPayload,
          capturedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        },
      ],
      inferredSchema: inferred,
      confirmedSchema: inferred,
    };

    onAdd(newInterface);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-slate-100">Add New IoT Interface</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1">Interface Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Interface 6: RS485 Modbus Sensor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Category & Format</label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as InterfaceCategory;
                  setCategory(cat);
                  if (cat === 'hex_binary' || cat === 'uart_protocol') setSampleFormat('hex');
                  else if (cat === 'csv_tabular') setSampleFormat('csv');
                  else setSampleFormat('json');
                }}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800"
              >
                <option value="uart_protocol">UART / Serial Protocol</option>
                <option value="hex_binary">Raw HEX / Binary Stream</option>
                <option value="json_stream">JSON Stream / Structured Object</option>
                <option value="firebase_rtdb">Firebase RTDB Path Document</option>
                <option value="csv_tabular">CSV / Tabular Time-Series</option>
                <option value="app_object">Frontend View Model / State</option>
                <option value="custom_text">Custom Text</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as InterfaceRole)}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800"
              >
                <option value="input">Input (Source)</option>
                <option value="output">Output (Sink)</option>
                <option value="bidirectional">Bidirectional</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Protocol Details</label>
              <input
                type="text"
                placeholder="e.g. Modbus RTU 9600 8N1"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Device Identifier</label>
              <input
                type="text"
                placeholder="e.g. MODBUS-CHAMBER-02"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Description</label>
            <input
              type="text"
              placeholder="Brief description of the physical or logical interface"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium">Representative Data Sample</label>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Format: {sampleFormat}
              </span>
            </div>
            <textarea
              rows={4}
              placeholder={sampleFormat === 'hex' ? '5A A5 06 83 50 00 01 03 52' : '{\n  "temperature": 24.5\n}'}
              value={samplePayload}
              onChange={(e) => setSamplePayload(e.target.value)}
              className="w-full font-mono text-xs bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg"
            >
              Add Interface
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
