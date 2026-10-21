import React, { useState } from 'react';
import { X, Copy, Download, Check, FileJson, Cpu, Flame, FileText, Upload } from 'lucide-react';
import { ProjectConfig, SimulationResult } from '../../types';
import { 
  exportProjectJson, 
  generateEsp32Header, 
  generateFirebaseRules, 
  generateMarkdownAuditReport 
} from '../../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectConfig;
  simulationResult: SimulationResult | null;
  onImportProject: (imported: ProjectConfig) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  simulationResult,
  onImportProject,
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'c_header' | 'firebase' | 'markdown'>('json');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  let content = '';
  let filename = '';

  if (activeTab === 'json') {
    content = exportProjectJson(project);
    filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_flow.json`;
  } else if (activeTab === 'c_header') {
    content = generateEsp32Header(project);
    filename = 'telemetry_model.h';
  } else if (activeTab === 'firebase') {
    content = generateFirebaseRules(project);
    filename = 'database.rules.json';
  } else if (activeTab === 'markdown') {
    content = generateMarkdownAuditReport(project, simulationResult || undefined);
    filename = 'data_lineage_audit.md';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.interfaces && parsed.nodes) {
          onImportProject(parsed);
          onClose();
        } else {
          alert('Invalid FlowWeaver project file: missing interfaces or nodes array.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full h-[650px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Export Specifications & Code Adapters
            </h3>
            <p className="text-xs text-slate-400">
              Export portable schemas, generated firmware adapter headers, cloud rules, or import existing flows.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip & Actions */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'json' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Project Config (JSON)</span>
            </button>

            <button
              onClick={() => setActiveTab('c_header')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'c_header' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>ESP32 C Structs (.h)</span>
            </button>

            <button
              onClick={() => setActiveTab('firebase')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'firebase' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Firebase RTDB Rules</span>
            </button>

            <button
              onClick={() => setActiveTab('markdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'markdown' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Report (.md)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer transition-colors border border-slate-700">
              <Upload className="w-3 h-3 text-slate-400" />
              <span>Import Flow</span>
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-[#060a12] p-4 overflow-auto font-mono text-xs text-slate-300 select-text">
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    </div>
  );
};
