import React, { useState, useMemo } from 'react';
import { 
  X, 
  Binary, 
  Send, 
  Copy, 
  Check, 
  Sparkles, 
  FileCode, 
  RefreshCw, 
  Terminal,
  HelpCircle,
  Tag,
  Hash
} from 'lucide-react';
import { normalizeHex } from '../../services/schemaInference';

interface HexInterpreterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHex?: string;
  nodeTitle?: string;
  theme?: 'light' | 'dark';
  onSendPayload?: (payload: string) => void;
}

interface InterpretedByte {
  index: number;
  hex: string;
  decimal: number;
  binary: string;
  char: string;
  role: 'header' | 'length' | 'command' | 'address' | 'data' | 'checksum' | 'misc';
  roleLabel: string;
  colorClass: string;
}

export const HexInterpreterModal: React.FC<HexInterpreterModalProps> = ({
  isOpen,
  onClose,
  initialHex = '5A A5 06 83 50 00 01 03 52',
  nodeTitle = 'Hex / UART Decoder',
  theme = 'dark',
  onSendPayload,
}) => {
  const isLight = theme === 'light';
  const [hexInput, setHexInput] = useState(initialHex);
  const [copied, setCopied] = useState(false);
  const [selectedByteIndex, setSelectedByteIndex] = useState<number | null>(null);

  // Sync initialHex when modal opens
  React.useEffect(() => {
    if (initialHex) {
      setHexInput(initialHex);
    }
  }, [initialHex, isOpen]);

  const bytes = useMemo(() => normalizeHex(hexInput), [hexInput]);

  // Protocol inference & byte labeling
  const { protocolName, interpretedBytes, summaryFields } = useMemo(() => {
    const isDwin = bytes.length >= 2 && bytes[0] === '5A' && bytes[1] === 'A5';
    const isModbus = !isDwin && bytes.length >= 4 && (bytes[1] === '03' || bytes[1] === '04' || bytes[1] === '06' || bytes[1] === '10');

    let proto = 'Generic Hex / UART Frame';
    if (isDwin) proto = 'DWIN T5L DGUS II Protocol';
    else if (isModbus) proto = 'Modbus RTU Frame';

    const labeled: InterpretedByte[] = bytes.map((b, idx) => {
      const dec = parseInt(b, 16);
      const bin = dec.toString(2).padStart(8, '0');
      const char = dec >= 32 && dec <= 126 ? String.fromCharCode(dec) : '.';

      let role: InterpretedByte['role'] = 'data';
      let roleLabel = 'Data Byte';
      let colorClass = isLight 
        ? 'bg-slate-100 text-slate-800 border-slate-300' 
        : 'bg-slate-800 text-slate-200 border-slate-700';

      if (isDwin) {
        if (idx === 0 || idx === 1) {
          role = 'header';
          roleLabel = 'Sync Header (0x5AA5)';
          colorClass = isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-950/70 text-amber-300 border-amber-700';
        } else if (idx === 2) {
          role = 'length';
          roleLabel = `Length (${dec} bytes)`;
          colorClass = isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-950/70 text-blue-300 border-blue-700';
        } else if (idx === 3) {
          role = 'command';
          roleLabel = dec === 0x83 ? 'Cmd: Read VP (0x83)' : dec === 0x82 ? 'Cmd: Write VP (0x82)' : `Cmd (0x${b})`;
          colorClass = isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-950/70 text-purple-300 border-purple-700';
        } else if (idx === 4 || idx === 5) {
          role = 'address';
          roleLabel = idx === 4 ? 'VP High Byte' : 'VP Low Byte';
          colorClass = isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-950/70 text-cyan-300 border-cyan-700';
        } else if (idx === 6) {
          role = 'misc';
          roleLabel = `Word Count (${dec} words)`;
          colorClass = isLight ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-indigo-950/70 text-indigo-300 border-indigo-700';
        } else {
          role = 'data';
          roleLabel = `Data Payload [${idx - 7}]`;
          colorClass = isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-950/70 text-emerald-300 border-emerald-700';
        }
      } else if (isModbus) {
        if (idx === 0) {
          role = 'address';
          roleLabel = `Slave ID (${dec})`;
          colorClass = isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-950/70 text-blue-300 border-blue-700';
        } else if (idx === 1) {
          role = 'command';
          roleLabel = `Function Code (0x${b})`;
          colorClass = isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-950/70 text-purple-300 border-purple-700';
        } else if (idx >= bytes.length - 2) {
          role = 'checksum';
          roleLabel = 'CRC16 Checksum';
          colorClass = isLight ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-rose-950/70 text-rose-300 border-rose-700';
        } else {
          role = 'data';
          roleLabel = `Payload Byte [${idx}]`;
          colorClass = isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-950/70 text-emerald-300 border-emerald-700';
        }
      }

      return {
        index: idx,
        hex: b,
        decimal: dec,
        binary: bin,
        char,
        role,
        roleLabel,
        colorClass,
      };
    });

    // Summary higher level fields
    const fields: { label: string; value: string; hint: string }[] = [];
    fields.push({ label: 'Total Bytes', value: `${bytes.length} bytes`, hint: `${bytes.length * 8} bits` });

    if (isDwin) {
      fields.push({ label: 'Sync Header', value: '0x5AA5', hint: 'DWIN DGUS II' });
      if (bytes.length >= 3) {
        fields.push({ label: 'Remaining Length', value: `${parseInt(bytes[2], 16)} bytes`, hint: 'Byte offset 2' });
      }
      if (bytes.length >= 4) {
        const cmd = bytes[3];
        fields.push({ 
          label: 'Command', 
          value: cmd === '83' ? '0x83 (Read VP)' : cmd === '82' ? '0x82 (Write VP)' : `0x${cmd}`, 
          hint: 'Byte offset 3' 
        });
      }
      if (bytes.length >= 6) {
        const vp = `0x${bytes[4]}${bytes[5]}`;
        fields.push({ label: 'Variable Pointer (VP)', value: vp, hint: 'Variable memory address' });
      }
      if (bytes.length >= 7) {
        fields.push({ label: 'Word Count', value: `${parseInt(bytes[6], 16)} words`, hint: '2 bytes per word' });
      }
      if (bytes.length >= 9) {
        const val16 = parseInt(bytes[7] + bytes[8], 16);
        const signedVal16 = val16 > 32767 ? val16 - 65536 : val16;
        fields.push({ 
          label: 'Data Word 1', 
          value: `${val16} (0x${bytes[7]}${bytes[8]})`, 
          hint: `Signed: ${signedVal16}` 
        });
      }
      if (bytes.length >= 11) {
        const val2 = parseInt(bytes[9] + bytes[10], 16);
        fields.push({ label: 'Data Word 2', value: `${val2} (0x${bytes[9]}${bytes[10]})`, hint: 'Word 2 value' });
      }
    } else {
      // General multi-byte interpretations
      if (bytes.length >= 2) {
        const u16BE = parseInt(bytes[0] + bytes[1], 16);
        const u16LE = parseInt(bytes[1] + bytes[0], 16);
        fields.push({ label: 'First 16-bit (BE)', value: `${u16BE}`, hint: `0x${bytes[0]}${bytes[1]}` });
        fields.push({ label: 'First 16-bit (LE)', value: `${u16LE}`, hint: `0x${bytes[1]}${bytes[0]}` });
      }
      if (bytes.length >= 4) {
        const u32BE = parseInt(bytes.slice(0, 4).join(''), 16);
        fields.push({ label: 'First 32-bit (BE)', value: `${u32BE}`, hint: `0x${bytes.slice(0, 4).join('')}` });
      }
      const asciiText = bytes.map(b => {
        const c = parseInt(b, 16);
        return c >= 32 && c <= 126 ? String.fromCharCode(c) : '.';
      }).join('');
      fields.push({ label: 'ASCII Decoded', value: asciiText, hint: 'Printable characters' });
    }

    return {
      protocolName: proto,
      interpretedBytes: labeled,
      summaryFields: fields,
    };
  }, [bytes, isLight]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bytes.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedByte = selectedByteIndex !== null ? interpretedBytes[selectedByteIndex] : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-950 text-cyan-400'}`}>
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Hex Code Packet Interpreter</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isLight 
                    ? 'bg-cyan-50 border-cyan-200 text-cyan-800' 
                    : 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                }`}>
                  {protocolName}
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Inspecting data payload on <span className="font-medium text-cyan-500">{nodeTitle}</span>
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

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Hex Input & Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Raw Hex Code / Stream
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Copy formatted bytes"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setHexInput('5A A5 06 83 50 00 01 03 52')}
                  className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Load DWIN standard preset"
                >
                  DWIN Preset
                </button>
                <button
                  onClick={() => setHexInput('01 03 00 64 00 02 85 D4')}
                  className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Load Modbus RTU preset"
                >
                  Modbus Preset
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                placeholder="e.g. 5A A5 06 83 50 00 01 03 52"
                className={`w-full font-mono text-sm px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500 tracking-wider ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600'
                }`}
              />
            </div>
          </div>

          {/* Byte-by-Byte Visual Inspector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Byte-by-Byte Breakdown ({bytes.length} bytes)
              </span>
              <span className="text-[11px] text-slate-400 italic">
                Click any byte to inspect binary bits & representations
              </span>
            </div>

            <div className={`p-3 rounded-xl border flex flex-wrap gap-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
            }`}>
              {interpretedBytes.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 italic text-center w-full">
                  No valid hex bytes detected. Enter hex characters above (e.g., 5A A5).
                </div>
              ) : (
                interpretedBytes.map((b) => {
                  const isSelected = selectedByteIndex === b.index;
                  return (
                    <button
                      key={b.index}
                      onClick={() => setSelectedByteIndex(isSelected ? null : b.index)}
                      className={`flex flex-col items-center p-2 rounded-lg border text-center transition-all cursor-pointer font-mono ${
                        b.colorClass
                      } ${isSelected ? 'ring-2 ring-cyan-500 scale-105 shadow-md' : 'hover:scale-102'}`}
                    >
                      <span className="text-[9px] opacity-70">#{b.index}</span>
                      <span className="text-sm font-bold tracking-wider">{b.hex}</span>
                      <span className="text-[10px] opacity-80 max-w-[64px] truncate">{b.decimal}</span>
                      <span className="text-[9px] font-sans px-1 py-0.2 rounded mt-0.5 bg-black/15 text-[8px] truncate max-w-[68px]">
                        {b.roleLabel.split(' ')[0]}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Byte Detail Inspector */}
          {selectedByte && (
            <div className={`p-3 rounded-lg border text-xs animate-in fade-in ${
              isLight ? 'bg-cyan-50/70 border-cyan-200 text-slate-800' : 'bg-cyan-950/30 border-cyan-800 text-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-cyan-500/20">
                <span className="font-semibold text-cyan-600 flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5" />
                  Byte #{selectedByte.index}: <code className="font-mono font-bold text-sm">0x{selectedByte.hex}</code>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                  {selectedByte.roleLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-1.5 rounded bg-black/10">
                  <div className="text-[10px] text-slate-400">Unsigned 8-bit</div>
                  <div className="font-bold">{selectedByte.decimal}</div>
                </div>
                <div className="p-1.5 rounded bg-black/10">
                  <div className="text-[10px] text-slate-400">Signed 8-bit</div>
                  <div className="font-bold">
                    {selectedByte.decimal > 127 ? selectedByte.decimal - 256 : selectedByte.decimal}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-black/10">
                  <div className="text-[10px] text-slate-400">Binary (8-bit)</div>
                  <div className="font-bold tracking-widest text-[10px]">{selectedByte.binary}</div>
                </div>
                <div className="p-1.5 rounded bg-black/10">
                  <div className="text-[10px] text-slate-400">ASCII Char</div>
                  <div className="font-bold">{selectedByte.char === '.' ? '(non-printable)' : `'${selectedByte.char}'`}</div>
                </div>
              </div>
            </div>
          )}

          {/* Interpreted Parameters / Values Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Interpreted Values & Protocol Fields
              </span>
            </div>
            <div className={`rounded-xl border divide-y overflow-hidden text-xs font-mono ${
              isLight ? 'bg-slate-50 border-slate-200 divide-slate-200' : 'bg-slate-950/60 border-slate-800 divide-slate-800'
            }`}>
              {summaryFields.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 hover:bg-black/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {f.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      ({f.hint})
                    </span>
                  </div>
                  <span className={`font-bold px-2 py-0.5 rounded ${
                    isLight ? 'bg-white text-cyan-800 border border-slate-200' : 'bg-slate-900 text-cyan-300 border border-slate-700'
                  }`}>
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="text-xs text-slate-400">
            Byte sequence parsed live via Hex Decoder engine
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                isLight 
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100' 
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Close
            </button>
            {onSendPayload && (
              <button
                onClick={() => {
                  onSendPayload(bytes.join(' '));
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Inject & Send to Node</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
