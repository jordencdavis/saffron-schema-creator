import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Search, 
  Plus, 
  Terminal, 
  Cpu, 
  LayoutDashboard, 
  FileSpreadsheet, 
  Layers, 
  Sliders, 
  ArrowRightLeft, 
  Filter as FilterIcon,
  Sparkles,
  X,
  Send,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Radio,
  CheckCircle2,
  ArrowRight,
  Database,
  Info,
  Binary,
  Copy,
  Check,
  Eye,
  Download,
  Upload,
  Inbox,
  History,
  RotateCcw
} from 'lucide-react';
import { FlowNode, FlowConnection, NodeType, InterfaceModel, SimulationResult, CustomParameter, DataType } from '../types';
import { EditParameterModal } from './Modals/EditParameterModal';
import { HexInterpreterModal } from './Modals/HexInterpreterModal';
import { EditPresetModal, SamplePreset, computeDwinHex } from './Modals/EditPresetModal';
import { normalizeHex } from '../services/schemaInference';

export interface InterpretedDwinPacket {
  rawHex: string;
  byteCount: number;
  syncHeader: string;
  lengthByte: number;
  commandCode: string;
  commandName: string;
  vpAddress: string;
  wordCount: number;
  numericalValue: number;
  signedValue: number;
  words: number[];
  ascii: string;
  isValidDwin: boolean;
}

export function interpretDwinPacket(rawHex: string): InterpretedDwinPacket {
  const bytes = normalizeHex(rawHex);
  const isValidDwin = bytes.length >= 2 && bytes[0] === '5A' && bytes[1] === 'A5';

  const len = bytes.length >= 3 ? parseInt(bytes[2], 16) : 0;
  const cmd = bytes.length >= 4 ? bytes[3] : '83';
  const commandName = cmd === '83' ? 'Read VP (0x83)' : cmd === '82' ? 'Write VP (0x82)' : `Cmd (0x${cmd})`;
  const vp = bytes.length >= 6 ? `0x${bytes[4]}${bytes[5]}` : '0x5000';
  const wordCount = bytes.length >= 7 ? parseInt(bytes[6], 16) : 1;

  const words: number[] = [];
  for (let i = 7; i + 1 < bytes.length; i += 2) {
    words.push(parseInt(bytes[i] + bytes[i + 1], 16));
  }

  const numVal = words.length > 0 ? words[0] : 0;
  const signedVal = numVal > 32767 ? numVal - 65536 : numVal;

  const ascii = bytes.map((b) => {
    const c = parseInt(b, 16);
    return c >= 32 && c <= 126 ? String.fromCharCode(c) : '.';
  }).join('');

  return {
    rawHex,
    byteCount: bytes.length,
    syncHeader: isValidDwin ? '0x5AA5' : (bytes.slice(0, 2).join(' ') || 'N/A'),
    lengthByte: len,
    commandCode: `0x${cmd}`,
    commandName,
    vpAddress: vp,
    wordCount,
    numericalValue: numVal,
    signedValue: signedVal,
    words,
    ascii,
    isValidDwin,
  };
}

export interface ReceivedHistoryItem {
  id: string;
  timestamp: string;
  sourceNodeTitle: string;
  sourceNodeId: string;
  rawHex: string;
  interpreted: InterpretedDwinPacket;
}

interface DataFlowCanvasProps {
  nodes: FlowNode[];
  connections: FlowConnection[];
  interfaces: InterfaceModel[];
  simulationResult: SimulationResult | null;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  theme?: 'light' | 'dark';
  onSelectNode: (id: string | null) => void;
  onSelectConnection: (id: string | null) => void;
  onUpdateNodePosition: (id: string, pos: { x: number; y: number }) => void;
  onAddConnection: (sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string) => void;
  onDeleteConnection: (id: string) => void;
  onAddNode: (type: NodeType, stage: number) => void;
  onDeleteNode: (id: string) => void;
  onAutoLayout: () => void;
  onSendFromNode: (nodeId: string, payload: string) => void;
  onAddParameterToNode: (nodeId: string, param: Omit<CustomParameter, 'id'>) => void;
  onUpdateParameterOnNode: (nodeId: string, paramId: string, updated: Partial<CustomParameter>) => void;
  onDeleteParameterFromNode: (nodeId: string, paramId: string) => void;
}

const INITIAL_SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'preset-normal',
    label: 'Normal (850 ppm)',
    vpAddress: '0x5000',
    parameters: [
      { id: 'p1', name: 'co2_raw', value: 850, unit: 'ppm' }
    ],
    hex: '5A A5 06 83 50 00 01 03 52',
  },
  {
    id: 'preset-high',
    label: 'High Alert (2000 ppm)',
    vpAddress: '0x5000',
    parameters: [
      { id: 'p2', name: 'co2_raw', value: 2000, unit: 'ppm' }
    ],
    hex: '5A A5 06 83 50 00 01 07 D0',
  },
  {
    id: 'preset-warn',
    label: 'Warning (1500 ppm)',
    vpAddress: '0x5000',
    parameters: [
      { id: 'p3', name: 'co2_raw', value: 1500, unit: 'ppm' }
    ],
    hex: '5A A5 06 83 50 00 01 05 DC',
  },
  {
    id: 'preset-fresh',
    label: 'Fresh Air (450 ppm)',
    vpAddress: '0x5000',
    parameters: [
      { id: 'p4', name: 'co2_raw', value: 450, unit: 'ppm' }
    ],
    hex: '5A A5 06 83 50 00 01 01 C2',
  },
  {
    id: 'preset-multi',
    label: 'Multi-Sensor (CO2 + Temp)',
    vpAddress: '0x5000',
    parameters: [
      { id: 'p5', name: 'co2_raw', value: 850, unit: 'ppm' },
      { id: 'p6', name: 'temp_raw', value: 245, unit: '0.1°C' }
    ],
    hex: '5A A5 08 83 50 00 02 03 52 00 F5',
  },
];

// Distinct light/pastel color palette for each row of 3 received history items (avoids dark colors)
export const RECEIVED_ROW_PALETTES = [
  {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-300 dark:border-sky-600',
    text: 'text-sky-900 dark:text-sky-100',
    badge: 'bg-sky-200/90 text-sky-900 dark:bg-sky-800 dark:text-sky-100',
    hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/60',
    label: 'Sky',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-600',
    text: 'text-emerald-900 dark:text-emerald-100',
    badge: 'bg-emerald-200/90 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100',
    hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
    label: 'Emerald',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-600',
    text: 'text-amber-900 dark:text-amber-100',
    badge: 'bg-amber-200/90 text-amber-900 dark:bg-amber-800 dark:text-amber-100',
    hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/60',
    label: 'Amber',
  },
  {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-300 dark:border-violet-600',
    text: 'text-violet-900 dark:text-violet-100',
    badge: 'bg-violet-200/90 text-violet-900 dark:bg-violet-800 dark:text-violet-100',
    hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/60',
    label: 'Violet',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-300 dark:border-rose-600',
    text: 'text-rose-900 dark:text-rose-100',
    badge: 'bg-rose-200/90 text-rose-900 dark:bg-rose-800 dark:text-rose-100',
    hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/60',
    label: 'Rose',
  },
  {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-300 dark:border-indigo-600',
    text: 'text-indigo-900 dark:text-indigo-100',
    badge: 'bg-indigo-200/90 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100',
    hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/60',
    label: 'Indigo',
  },
  {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-300 dark:border-teal-600',
    text: 'text-teal-900 dark:text-teal-100',
    badge: 'bg-teal-200/90 text-teal-900 dark:bg-teal-800 dark:text-teal-100',
    hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/60',
    label: 'Teal',
  },
  {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-300 dark:border-orange-600',
    text: 'text-orange-900 dark:text-orange-100',
    badge: 'bg-orange-200/90 text-orange-900 dark:bg-orange-800 dark:text-orange-100',
    hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/60',
    label: 'Orange',
  },
  {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    border: 'border-fuchsia-300 dark:border-fuchsia-600',
    text: 'text-fuchsia-900 dark:text-fuchsia-100',
    badge: 'bg-fuchsia-200/90 text-fuchsia-900 dark:bg-fuchsia-800 dark:text-fuchsia-100',
    hover: 'hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/60',
    label: 'Fuchsia',
  },
  {
    bg: 'bg-lime-50 dark:bg-lime-950/40',
    border: 'border-lime-300 dark:border-lime-600',
    text: 'text-lime-900 dark:text-lime-100',
    badge: 'bg-lime-200/90 text-lime-900 dark:bg-lime-800 dark:text-lime-100',
    hover: 'hover:bg-lime-100 dark:hover:bg-lime-900/60',
    label: 'Lime',
  },
];

export const DataFlowCanvas: React.FC<DataFlowCanvasProps> = ({
  nodes,
  connections,
  interfaces,
  simulationResult,
  selectedNodeId,
  selectedConnectionId,
  theme = 'light',
  onSelectNode,
  onSelectConnection,
  onUpdateNodePosition,
  onAddConnection,
  onDeleteConnection,
  onAddNode,
  onDeleteNode,
  onAutoLayout,
  onSendFromNode,
  onAddParameterToNode,
  onUpdateParameterOnNode,
  onDeleteParameterFromNode,
}) => {
  const isLight = theme === 'light';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Wire drawing state
  const [connectingSource, setConnectingSource] = useState<{
    nodeId: string;
    portId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Interactive Node Send State
  const [openSendNodeId, setOpenSendNodeId] = useState<string | null>(null);
  const [hexInputByNode, setHexInputByNode] = useState<Record<string, string>>({
    'node-dwin-src': '5A A5 06 83 50 00 01 03 52',
    'node-hex-parser': '5A A5 06 83 50 00 01 03 52',
  });

  // Animated Packet Transmission State
  const [activeBursts, setActiveBursts] = useState<
    Record<string, { key: number; label: string; sourceNodeId: string; targetNodeId: string }>
  >({});
  const [recentlyReceivedNodeIds, setRecentlyReceivedNodeIds] = useState<string[]>([]);

  // Parameter Edit Modal State
  const [paramModalState, setParamModalState] = useState<{
    isOpen: boolean;
    nodeId: string;
    nodeTitle: string;
    parameter?: CustomParameter | null;
  } | null>(null);

  // Collapsed state per node
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Hex Interpreter Modal State
  const [hexInterpreterState, setHexInterpreterState] = useState<{
    isOpen: boolean;
    hex: string;
    nodeTitle: string;
    nodeId: string;
  } | null>(null);

  const [copiedPacketNodeId, setCopiedPacketNodeId] = useState<string | null>(null);

  const handleCopyPacket = (nodeId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPacketNodeId(nodeId);
    setTimeout(() => setCopiedPacketNodeId(null), 1800);
  };

  // Sample Presets State & Import/Export
  const [samplePresets, setSamplePresets] = useState<SamplePreset[]>(INITIAL_SAMPLE_PRESETS);
  const [editingPreset, setEditingPreset] = useState<{ isOpen: boolean; preset: SamplePreset | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPresets = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(samplePresets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "dwin_sample_presets.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validated: SamplePreset[] = parsed.map((item, idx) => ({
            id: item.id || `preset-${Date.now()}-${idx}`,
            label: item.label || `Preset ${idx + 1}`,
            vpAddress: item.vpAddress || '0x5000',
            parameters: Array.isArray(item.parameters) ? item.parameters : [],
            hex: item.hex || computeDwinHex(item.vpAddress || '0x5000', item.parameters || []),
          }));
          setSamplePresets(validated);
        }
      } catch (err) {
        console.error('Failed to parse imported presets JSON:', err);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Received Packets History (up to 50 items per node, persistent until cleared)
  const [receivedHistoryByNode, setReceivedHistoryByNode] = useState<Record<string, ReceivedHistoryItem[]>>({
    'node-hex-parser': [
      {
        id: 'init-pkt-1',
        timestamp: '10:00:00',
        sourceNodeTitle: 'DWIN UART Ingest',
        sourceNodeId: 'node-dwin-src',
        rawHex: '5A A5 06 83 50 00 01 03 52',
        interpreted: interpretDwinPacket('5A A5 06 83 50 00 01 03 52'),
      },
    ],
    'node-esp-enrich': [
      {
        id: 'init-pkt-esp-1',
        timestamp: '10:00:01',
        sourceNodeTitle: 'DWIN Frame Decoder',
        sourceNodeId: 'node-hex-parser',
        rawHex: '5A A5 06 83 50 00 01 03 52',
        interpreted: interpretDwinPacket('5A A5 06 83 50 00 01 03 52'),
      },
    ],
  });

  // Received screen open state per node (independent toggles so clicking Received on one node does NOT hide others)
  const [openReceivedNodeIds, setOpenReceivedNodeIds] = useState<Record<string, boolean>>({
    'node-hex-parser': true,
  });
  const [selectedHistoryPacketId, setSelectedHistoryPacketId] = useState<Record<string, string>>({
    'node-hex-parser': 'init-pkt-1',
    'node-esp-enrich': 'init-pkt-esp-1',
  });

  const handleClearHistory = (nodeId: string) => {
    setReceivedHistoryByNode((prev) => ({ ...prev, [nodeId]: [] }));
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to get interface color
  const getInterfaceColor = (interfaceId?: string) => {
    if (!interfaceId) return '#0284c7';
    const found = interfaces.find((i) => i.id === interfaceId);
    return found?.colorTheme || '#0284c7';
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'source':
        return <Terminal className="w-3.5 h-3.5" />;
      case 'hex_decoder':
        return <Layers className="w-3.5 h-3.5" />;
      case 'enricher':
        return <Cpu className="w-3.5 h-3.5" />;
      case 'destination':
        return <LayoutDashboard className="w-3.5 h-3.5" />;
      case 'scaling':
      case 'unit_converter':
        return <Sliders className="w-3.5 h-3.5" />;
      case 'rename':
        return <ArrowRightLeft className="w-3.5 h-3.5" />;
      case 'filter':
        return <FilterIcon className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  // Convert client coords to canvas coords
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode(null);
      onSelectConnection(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggingNodeId) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      onUpdateNodePosition(draggingNodeId, {
        x: Math.round(canvasPos.x - dragOffset.x),
        y: Math.round(canvasPos.y - dragOffset.y),
      });
    } else if (connectingSource) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setMousePos(canvasPos);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingSource(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Increased zoom speed by 200% (from 1.15x to 1.35x zoom-in / 0.74x zoom-out)
    const zoomFactor = e.deltaY < 0 ? 1.35 : 0.74;
    // Expanded limits: 10% (0.1) minimum for wide overview, 500% (5.0) maximum for close-up view
    const newZoom = Math.max(0.1, Math.min(5.0, zoom * zoomFactor));

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Node Drag Start
  const startDragNode = (e: React.MouseEvent, node: FlowNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    onSelectConnection(null);
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setDragOffset({
      x: canvasPos.x - node.position.x,
      y: canvasPos.y - node.position.y,
    });
    setDraggingNodeId(node.id);
  };

  // Start wire from output port
  const startConnecting = (e: React.MouseEvent, nodeId: string, portId: string, portX: number, portY: number) => {
    e.stopPropagation();
    setConnectingSource({
      nodeId,
      portId,
      startX: portX,
      startY: portY,
    });
    setMousePos({ x: portX, y: portY });
  };

  // End wire on input port
  const finishConnecting = (e: React.MouseEvent, targetNodeId: string, targetPortId: string) => {
    e.stopPropagation();
    if (connectingSource && connectingSource.nodeId !== targetNodeId) {
      onAddConnection(connectingSource.nodeId, connectingSource.portId, targetNodeId, targetPortId);
    }
    setConnectingSource(null);
  };

  // Node Geometry constants
  const NODE_WIDTH = 320;
  const HEADER_HEIGHT = 44;
  const PORT_ROW_HEIGHT = 28;

  const getPortCoords = (nodeId: string, portId: string, isInput: boolean) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const ports = isInput ? node.inputs : node.outputs;
    const portIndex = ports.findIndex((p) => p.id === portId);
    const idx = portIndex >= 0 ? portIndex : 0;
    const y = node.position.y + HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2;
    const x = isInput ? node.position.x : node.position.x + NODE_WIDTH;
    return { x, y };
  };

  // Handle User Triggering "Send" on a Node
  const triggerNodeSend = (nodeId: string, customPayload?: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const payload = customPayload !== undefined 
      ? customPayload 
      : (hexInputByNode[nodeId] || '5A A5 06 83 50 00 01 03 52');

    // 1. Notify parent handler to update simulation with new payload
    onSendFromNode(nodeId, payload);

    // 2. Trigger packet flight animation along all outgoing connections
    const outgoingConns = connections.filter((c) => c.sourceNodeId === nodeId);
    if (outgoingConns.length > 0) {
      const now = Date.now();
      const newBursts: Record<string, { key: number; label: string; sourceNodeId: string; targetNodeId: string }> = {};
      const targetIds: string[] = [];

      outgoingConns.forEach((c) => {
        newBursts[c.id] = {
          key: now + Math.random(),
          label: payload.length > 14 ? payload.slice(0, 12) + '...' : payload,
          sourceNodeId: c.sourceNodeId,
          targetNodeId: c.targetNodeId,
        };
        targetIds.push(c.targetNodeId);
      });

      setActiveBursts((prev) => ({ ...prev, ...newBursts }));

      // Record packet into received history for target nodes and open received view first
      const dateNow = new Date();
      const timeStr = dateNow.toTimeString().split(' ')[0];
      const interpreted = interpretDwinPacket(payload);

      targetIds.forEach((tId) => {
        const newRecord: ReceivedHistoryItem = {
          id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: timeStr,
          sourceNodeTitle: node.title,
          sourceNodeId: node.id,
          rawHex: payload,
          interpreted,
        };

        setReceivedHistoryByNode((prev) => {
          const list = prev[tId] || [];
          const updated = [newRecord, ...list].slice(0, 50);
          return { ...prev, [tId]: updated };
        });

        setSelectedHistoryPacketId((prev) => ({ ...prev, [tId]: newRecord.id }));
        setOpenReceivedNodeIds((prev) => ({ ...prev, [tId]: true }));
      });

      // When packet reaches connected node(s) after 1.2s:
      setTimeout(() => {
        setRecentlyReceivedNodeIds((prev) => Array.from(new Set([...prev, ...targetIds])));
      }, 1200);

      // Clean up glow highlights after 3s
      setTimeout(() => {
        setRecentlyReceivedNodeIds((prev) => prev.filter((id) => !targetIds.includes(id)));
        setActiveBursts((prev) => {
          const next = { ...prev };
          outgoingConns.forEach((c) => delete next[c.id]);
          return next;
        });
      }, 3000);
    }
  };

  // Fit to screen
  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 20, y: 20 });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`relative flex-1 h-full w-full overflow-hidden select-none cursor-default transition-colors ${
        isLight ? 'bg-[#f8fafc]' : 'bg-[#0a0e17]'
      }`}
      style={{
        backgroundImage: isLight
          ? `radial-gradient(circle at 1px 1px, rgba(100,116,139,0.18) 1px, transparent 0)`
          : `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Canvas Floating Top Toolbar */}
      <div className={`absolute top-4 left-4 z-20 flex items-center gap-2 backdrop-blur px-3 py-1.5 rounded-lg border shadow-lg ${
        isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-800 text-slate-200'
      }`}>
        {/* Search Filter */}
        <div className="relative flex items-center">
          <Search className={`w-3.5 h-3.5 absolute left-2 pointer-events-none ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`text-xs pl-7 pr-2 py-1 rounded border focus:outline-none focus:border-cyan-500 w-36 ${
              isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-slate-200 border-slate-800'
            }`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-1 text-slate-400 hover:text-slate-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className={`h-4 w-[1px] ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Zoom Controls */}
        <button
          onClick={() => setZoom((z) => Math.min(5.0, Number((z + 0.3).toFixed(2))))}
          title="Zoom In"
          className={`p-1 rounded ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className={`text-[11px] font-mono min-w-[36px] text-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.1, Number((z - 0.3).toFixed(2))))}
          title="Zoom Out"
          className={`p-1 rounded ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFitToScreen}
          title="Fit to Screen"
          className={`p-1 rounded ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className={`h-4 w-[1px] ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

        {/* Add Transformation Node Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              isLight 
                ? 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200' 
                : 'text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-800/80'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Add Node</span>
          </button>

          {showAddMenu && (
            <div className={`absolute left-0 top-full mt-1.5 w-48 border rounded-lg shadow-xl p-1 z-30 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <div className={`text-[10px] uppercase font-mono px-2 py-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                Processing Nodes
              </div>
              <button
                onClick={() => {
                  onAddNode('hex_decoder', 2);
                  setShowAddMenu(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded ${
                  isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                <span>Hex / UART Decoder</span>
              </button>
              <button
                onClick={() => {
                  onAddNode('scaling', 3);
                  setShowAddMenu(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded ${
                  isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-violet-500" />
                <span>Numeric Scaler (ax + b)</span>
              </button>
              <button
                onClick={() => {
                  onAddNode('unit_converter', 3);
                  setShowAddMenu(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded ${
                  isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Unit Converter</span>
              </button>
              <button
                onClick={() => {
                  onAddNode('rename', 3);
                  setShowAddMenu(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded ${
                  isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                <span>Rename Field</span>
              </button>
              <button
                onClick={() => {
                  onAddNode('enricher', 3);
                  setShowAddMenu(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded ${
                  isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                <span>Metadata Enricher</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SVG Connection Layer - Completely unrestricted path length & canvas bounds */}
      <svg
        className="absolute inset-0 pointer-events-none canvas-connections-svg"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <linearGradient id="wireGradientDefault" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.85" />
          </linearGradient>
          <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" />
          </filter>
        </defs>

        {/* Existing Connections */}
        {connections.map((conn) => {
          const srcCoords = getPortCoords(conn.sourceNodeId, conn.sourcePortId, false);
          const tgtCoords = getPortCoords(conn.targetNodeId, conn.targetPortId, true);

          const isSelected = selectedConnectionId === conn.id;
          const dx = tgtCoords.x - srcCoords.x;
          // Unrestricted curve offset - no 180px length limit or restriction
          const curveOffset = Math.max(40, Math.abs(dx) * 0.5);

          const pathD = `
            M ${srcCoords.x} ${srcCoords.y}
            C ${srcCoords.x + (tgtCoords.x >= srcCoords.x ? curveOffset : Math.max(60, curveOffset))} ${srcCoords.y},
              ${tgtCoords.x - (tgtCoords.x >= srcCoords.x ? curveOffset : Math.max(60, curveOffset))} ${tgtCoords.y},
              ${tgtCoords.x} ${tgtCoords.y}
          `;

          const midX = (srcCoords.x + tgtCoords.x) / 2;
          const midY = (srcCoords.y + tgtCoords.y) / 2;
          const burst = activeBursts[conn.id];

          return (
            <g key={conn.id} className="pointer-events-auto cursor-pointer group" style={{ overflow: 'visible' }}>
              {/* Invisible thicker stroke for easy clicking */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ overflow: 'visible' }}
                onClick={() => {
                  onSelectConnection(conn.id);
                  onSelectNode(null);
                }}
              />

              {/* Background ambient line */}
              <path
                d={pathD}
                fill="none"
                stroke={isLight ? '#cbd5e1' : '#1e293b'}
                strokeWidth={3}
                style={{ overflow: 'visible' }}
              />

              {/* Animated dashed flowing wire */}
              <path
                d={pathD}
                fill="none"
                stroke={isSelected ? '#0284c7' : isLight ? '#0284c7' : 'url(#wireGradientDefault)'}
                strokeWidth={isSelected ? 3.5 : 2.5}
                strokeDasharray="6,5"
                className="wire-animated-flow transition-colors group-hover:stroke-cyan-400"
                style={{ overflow: 'visible' }}
                onClick={() => {
                  onSelectConnection(conn.id);
                  onSelectNode(null);
                }}
              />

              {/* Active High-Energy Animated Packet Traveling along the wire */}
              {burst && (
                <g key={`burst-${burst.key}`} style={{ overflow: 'visible' }}>
                  {/* Outer glowing halo */}
                  <circle r="9" fill="#06b6d4" opacity="0.4" filter="url(#packetGlow)">
                    <animateMotion
                      dur="1.2s"
                      repeatCount="1"
                      path={pathD}
                      fill="freeze"
                    />
                  </circle>
                  {/* Inner bright core */}
                  <circle r="5" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.5">
                    <animateMotion
                      dur="1.2s"
                      repeatCount="1"
                      path={pathD}
                      fill="freeze"
                    />
                  </circle>
                </g>
              )}

              {/* Connection Contract Badge */}
              <g
                transform={`translate(${midX}, ${midY})`}
                onClick={() => {
                  onSelectConnection(conn.id);
                  onSelectNode(null);
                }}
              >
                <rect
                  x={-32}
                  y={-10}
                  width={64}
                  height={20}
                  rx={4}
                  className={`transition-all ${
                    isSelected
                      ? isLight
                        ? 'fill-cyan-100 stroke-cyan-600 stroke-1'
                        : 'fill-cyan-900 stroke-cyan-400 stroke-1'
                      : isLight
                        ? 'fill-white stroke-slate-300 stroke-1 shadow-2xs group-hover:stroke-cyan-600'
                        : 'fill-slate-900/90 stroke-slate-700 stroke-1 group-hover:stroke-cyan-500'
                  }`}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-medium select-none pointer-events-none ${
                    isLight ? 'fill-slate-700' : 'fill-slate-300'
                  }`}
                >
                  {conn.mappings?.length ? `${conn.mappings.length} map` : 'wire'}
                </text>
              </g>
            </g>
          );
        })}

        {/* In-progress Drag Wire - Completely unrestricted length */}
        {connectingSource && (() => {
          const dragDx = mousePos.x - connectingSource.startX;
          const dragOffset = Math.max(40, Math.abs(dragDx) * 0.5);
          const dragPathD = `
            M ${connectingSource.startX} ${connectingSource.startY}
            C ${connectingSource.startX + dragOffset} ${connectingSource.startY},
              ${mousePos.x - dragOffset} ${mousePos.y},
              ${mousePos.x} ${mousePos.y}
          `;
          return (
            <path
              d={dragPathD}
              fill="none"
              stroke="#0284c7"
              strokeWidth={2.5}
              strokeDasharray="4,4"
              style={{ overflow: 'visible' }}
            />
          );
        })()}
      </svg>

      {/* Nodes Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const ifColor = getInterfaceColor(node.interfaceId);
          const isHighlighted =
            searchQuery &&
            (node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              node.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()));

          const isSendOpen = openSendNodeId === node.id;
          const isReceivedOpen = openReceivedNodeIds[node.id] ?? false;
          const isCollapsed = collapsedNodes[node.id] || false;
          const isRecentlyReceived = recentlyReceivedNodeIds.includes(node.id);

          const historyItems = receivedHistoryByNode[node.id] || [];
          const activePacketId = selectedHistoryPacketId[node.id] || historyItems[0]?.id;
          const activePacket = historyItems.find((p) => p.id === activePacketId) || historyItems[0] || null;
          const activeInterpreted = activePacket ? (activePacket.interpreted || interpretDwinPacket(activePacket.rawHex)) : null;

          // Get trace for this node
          const trace = simulationResult?.traces[node.id];
          const inputPayload = trace?.inputPayload as Record<string, unknown> | null;
          const outputPayload = trace?.outputPayload as Record<string, unknown> | null;

          // Detect raw hex packet from input payload or node configuration
          const rawHex = typeof inputPayload?.rawPayload === 'string'
            ? inputPayload.rawPayload
            : typeof inputPayload?.raw_hex_frame === 'string'
            ? inputPayload.raw_hex_frame
            : typeof inputPayload?.frameBytes === 'string'
            ? inputPayload.frameBytes
            : typeof inputPayload?.raw_hex === 'string'
            ? inputPayload.raw_hex
            : node.config.lastSentPayload
            ? node.config.lastSentPayload
            : node.type === 'hex_decoder'
            ? '5A A5 06 83 50 00 01 03 52'
            : undefined;

          // Compute custom / added parameters
          const customParams = node.config.customParameters || [];

          return (
            <div
              key={node.id}
              style={{
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                width: `${NODE_WIDTH}px`,
              }}
              className={`absolute pointer-events-auto rounded-xl border transition-all select-none ${
                isRecentlyReceived
                  ? 'ring-4 ring-emerald-500/60 border-emerald-500 shadow-2xl packet-received-pulse'
                  : isSelected
                  ? isLight
                    ? 'bg-white border-cyan-500 shadow-xl ring-2 ring-cyan-500/30'
                    : 'bg-slate-900 border-cyan-400 shadow-xl ring-2 ring-cyan-500/30'
                  : isHighlighted
                  ? isLight
                    ? 'bg-white border-amber-500 shadow-md ring-1 ring-amber-400/40'
                    : 'bg-slate-900 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                  : isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    : 'bg-slate-900/95 border-slate-800 hover:border-slate-700 shadow-md'
              }`}
            >
              {/* Top Accent Strip */}
              <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: ifColor }} />

              {/* Node Header (Draggable) */}
              <div
                onMouseDown={(e) => startDragNode(e, node)}
                className={`flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing ${
                  isLight ? 'border-slate-100 bg-slate-50/60' : 'border-slate-800/80 bg-slate-950/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`p-1.5 rounded-md ${isLight ? 'bg-white shadow-2xs' : 'bg-slate-800'}`} style={{ color: ifColor }}>
                    {getNodeIcon(node.type)}
                  </span>
                  <div className="truncate">
                    <div className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {node.title}
                    </div>
                    {node.subtitle && (
                      <div className={`text-[10px] font-mono truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {node.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Received Button: shows data received from DWIN UART Ingest node */}
                  {(node.inputs.length > 0 || historyItems.length > 0 || node.type === 'hex_decoder') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenReceivedNodeIds((prev) => ({
                          ...prev,
                          [node.id]: !prev[node.id],
                        }));
                        if (!isReceivedOpen && isSendOpen) {
                          setOpenSendNodeId(null);
                        }
                      }}
                      title="Data received from DWIN UART Ingest node (keeps history up to 50 packets)"
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                        isReceivedOpen
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : isRecentlyReceived
                          ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse shadow-xs'
                          : isLight
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                          : 'bg-emerald-950/70 text-emerald-400 hover:bg-emerald-900/80 border-emerald-800/80'
                      }`}
                    >
                      <Inbox className="w-3 h-3" />
                      <span>Received</span>
                      {historyItems.length > 0 && (
                        <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono font-bold leading-none ${
                          isReceivedOpen
                            ? 'bg-emerald-800/90 text-white'
                            : isLight
                            ? 'bg-emerald-200/90 text-emerald-900'
                            : 'bg-emerald-900/90 text-emerald-200'
                        }`}>
                          {historyItems.length}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Send Button on Each Node */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenSendNodeId(isSendOpen ? null : node.id);
                      if (!isSendOpen && isReceivedOpen) {
                        setOpenReceivedNodeIds((prev) => ({
                          ...prev,
                          [node.id]: false,
                        }));
                      }
                    }}
                    title="Send / Transmit Data from this Node"
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                      isSendOpen
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                        : isLight
                        ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200'
                        : 'bg-cyan-950/70 text-cyan-400 hover:bg-cyan-900/80 border-cyan-800/80'
                    }`}
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>

                  {/* Stage badge */}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700/50'
                  }`}>
                    S{node.stage}
                  </span>

                  {/* Collapse Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsedNodes((prev) => ({ ...prev, [node.id]: !isCollapsed }));
                    }}
                    className={`p-1 rounded ${isLight ? 'hover:bg-slate-200 text-slate-400' : 'hover:bg-slate-800 text-slate-500'}`}
                  >
                    {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Recently Received Notification Banner */}
              {isRecentlyReceived && (
                <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Data packet received from DWIN UART Ingest!</span>
                  </div>
                  <span className="text-[9px] opacity-90">Live Ingest</span>
                </div>
              )}

              {/* RECEIVED DATA SCREEN: Shows data received from DWIN UART Ingest node with history up to 50 & in-node interpretation */}
              {isReceivedOpen && (
                <div className={`p-3 border-b space-y-2.5 transition-colors ${
                  isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-emerald-950/40 border-emerald-800/60'
                }`}>
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${
                        isLight ? 'text-emerald-950' : 'text-emerald-200'
                      }`}>
                        Received from DWIN UART
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* History counter badge */}
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        isLight 
                          ? 'bg-white text-emerald-800 border-emerald-200' 
                          : 'bg-slate-900 text-emerald-300 border-emerald-800'
                      }`}>
                        {historyItems.length}/50 history
                      </span>

                      {/* Clear history button */}
                      {historyItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleClearHistory(node.id)}
                          title="Clear received history (up to 50 packets)"
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                            isLight
                              ? 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200'
                              : 'bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border-slate-800 hover:border-rose-800'
                          }`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Clear</span>
                        </button>
                      )}

                      {/* Close Drawer button */}
                      <button
                        type="button"
                        onClick={() => setOpenReceivedNodeIds((prev) => ({ ...prev, [node.id]: false }))}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Empty State */}
                  {historyItems.length === 0 ? (
                    <div className={`p-3 text-center rounded-lg border border-dashed text-xs ${
                      isLight ? 'bg-white/80 border-slate-300 text-slate-500' : 'bg-slate-900/60 border-slate-700 text-slate-400'
                    }`}>
                      <p className="font-medium">No packets in history</p>
                      <p className="text-[10px] mt-0.5 opacity-80">
                        Transmit a packet from DWIN UART Ingest node or select a preset to ingest live data.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Packet History Grid (3 per row, up to 10 rows then vertical scroll) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          <span>Packet History (select to view):</span>
                          <span className="font-mono text-[9px]">
                            #{historyItems.findIndex((p) => p.id === activePacket?.id) + 1} of {historyItems.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                          {historyItems.map((item, idx) => {
                            const isSelected = item.id === activePacket?.id;
                            const rowIndex = Math.floor(idx / 3);
                            const palette = RECEIVED_ROW_PALETTES[rowIndex % RECEIVED_ROW_PALETTES.length];

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedHistoryPacketId((prev) => ({ ...prev, [node.id]: item.id }))}
                                className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded text-[10px] font-mono border transition-all text-center truncate ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-400/50 shadow-xs font-bold'
                                    : `${palette.bg} ${palette.border} ${palette.text} ${palette.hover} font-medium`
                                }`}
                                title={`Row ${rowIndex + 1} (${palette.label}) · ${item.timestamp} - ${item.rawHex}`}
                              >
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                                  isSelected ? 'bg-white/20 text-white' : palette.badge
                                }`}>
                                  #{idx + 1}
                                </span>
                                <span className="truncate">{item.timestamp}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ACTIVE PACKET INTERPRETATION VIEW */}
                      {activePacket && activeInterpreted && (
                        <div className={`p-2.5 rounded-lg border space-y-2 ${
                          isLight ? 'bg-white/95 border-emerald-200 shadow-2xs' : 'bg-slate-900/90 border-emerald-800/80 shadow-2xs'
                        }`}>
                          {/* Meta bar: Timestamp, source, copy hex, inspect modal */}
                          <div className="flex items-center justify-between border-b pb-1.5 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {activePacket.sourceNodeTitle}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">
                                {activePacket.timestamp}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyPacket(node.id, activePacket.rawHex)}
                                title="Copy Raw Hex to Clipboard"
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                                  copiedPacketNodeId === node.id
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : isLight
                                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                }`}
                              >
                                {copiedPacketNodeId === node.id ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                                <span>{copiedPacketNodeId === node.id ? 'Copied' : 'Copy'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setHexInterpreterState({
                                  isOpen: true,
                                  hex: activePacket.rawHex,
                                  nodeTitle: node.title,
                                  nodeId: node.id,
                                })}
                                title="Open Full Deep Hex Code Interpreter Modal"
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                                  isLight
                                    ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
                                    : 'bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border-cyan-800'
                                }`}
                              >
                                <Binary className="w-2.5 h-2.5 text-cyan-500" />
                                <span>Inspect</span>
                              </button>
                            </div>
                          </div>

                          {/* Color-Coded Hex Bytes Breakdown */}
                          <div>
                            <div className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                              <span>Raw Packet ({activeInterpreted.byteCount} Bytes):</span>
                              <span className="font-mono text-[9px] text-slate-400">
                                {activeInterpreted.isValidDwin ? '5A A5 Sync' : 'UART Stream'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 p-1.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                              {normalizeHex(activePacket.rawHex).map((byte, bIdx) => {
                                let roleColor = 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
                                let roleTitle = `Byte ${bIdx}: 0x${byte}`;

                                if (bIdx === 0 || bIdx === 1) {
                                  roleColor = 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800';
                                  roleTitle = `Header Sync 0x5AA5 (Byte ${bIdx})`;
                                } else if (bIdx === 2) {
                                  roleColor = 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
                                  roleTitle = `Length: ${parseInt(byte, 16)} bytes`;
                                } else if (bIdx === 3) {
                                  roleColor = 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800';
                                  roleTitle = `Command: 0x${byte} (${byte === '83' ? 'Read VP' : byte === '82' ? 'Write VP' : 'Cmd'})`;
                                } else if (bIdx === 4 || bIdx === 5) {
                                  roleColor = 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
                                  roleTitle = `VP Address Byte ${bIdx === 4 ? 'High' : 'Low'}`;
                                } else if (bIdx === 6) {
                                  roleColor = 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800';
                                  roleTitle = `Word Count: ${parseInt(byte, 16)}`;
                                } else if (bIdx >= 7) {
                                  roleColor = 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-700 font-bold';
                                  roleTitle = `Data Payload Byte`;
                                }

                                return (
                                  <span
                                    key={bIdx}
                                    title={roleTitle}
                                    className={`px-1 py-0.5 rounded cursor-help ${roleColor}`}
                                  >
                                    {byte}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* INTERPRETED DWIN DATA IN NODE */}
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[9px] uppercase font-semibold text-emerald-700 dark:text-emerald-400 tracking-wider flex items-center justify-between">
                              <span>Interpreted Data in Node:</span>
                              <span className="font-mono text-[9px] text-slate-400">
                                {activeInterpreted.isValidDwin ? '✓ DWIN DGUS II Frame' : 'Custom UART'}
                              </span>
                            </div>

                            {/* Interpretation Grid */}
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              {/* VP Address */}
                              <div className={`p-1.5 rounded border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                                <span className="text-slate-400 block text-[9px]">VP Address</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {activeInterpreted.vpAddress}
                                </span>
                              </div>

                              {/* Command */}
                              <div className={`p-1.5 rounded border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                                <span className="text-slate-400 block text-[9px]">Command Code</span>
                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                  {activeInterpreted.commandName}
                                </span>
                              </div>

                              {/* Decoded Value (Decimal) */}
                              <div className={`p-1.5 rounded border ${isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-emerald-950/50 border-emerald-800/80'}`}>
                                <span className="text-slate-400 block text-[9px]">Decimal Value</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                                    {activeInterpreted.numericalValue}
                                  </span>
                                  <span className="text-[9px] text-slate-500">
                                    {activeInterpreted.vpAddress === '0x5000' ? 'ppm' : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Raw 16-bit Hex Word */}
                              <div className={`p-1.5 rounded border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                                <span className="text-slate-400 block text-[9px]">16-Bit Word</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                  {activeInterpreted.words.length > 0
                                    ? `0x${activeInterpreted.words[0].toString(16).padStart(4, '0').toUpperCase()}`
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Multi-words breakdown if more than 1 word */}
                            {activeInterpreted.words.length > 1 && (
                              <div className={`p-1.5 rounded border text-[10px] ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                              }`}>
                                <span className="text-slate-400 block text-[9px] mb-1">
                                  Multi-Word Parameters ({activeInterpreted.words.length} Words):
                                </span>
                                <div className="space-y-1">
                                  {activeInterpreted.words.map((w, wIdx) => (
                                    <div key={wIdx} className="flex items-center justify-between font-mono text-[10px]">
                                      <span className="text-slate-500">
                                        {wIdx === 0 ? 'Word 0 (CO2)' : wIdx === 1 ? 'Word 1 (Temp)' : `Word ${wIdx}`}:
                                      </span>
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {w} {wIdx === 0 ? 'ppm' : wIdx === 1 ? '(24.5 °C)' : ''}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Binary & ASCII details */}
                            <div className={`px-2 py-1 rounded text-[9px] font-mono flex items-center justify-between border ${
                              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}>
                              <span>Bin: {activeInterpreted.words.length > 0 
                                ? activeInterpreted.words[0].toString(2).padStart(16, '0').match(/.{1,4}/g)?.join(' ') 
                                : '0000 0000 0000 0000'}</span>
                              <span>ASCII: "{activeInterpreted.ascii.slice(0, 8)}"</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TRANSMISSION DRAWER: Hex / Payload Input to Send */}
              {isSendOpen && (
                <div className={`p-3 border-b space-y-2.5 transition-colors ${
                  isLight ? 'bg-cyan-50/70 border-cyan-200' : 'bg-cyan-950/40 border-cyan-800/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-cyan-800' : 'text-cyan-300'
                    }`}>
                      <Radio className="w-3 h-3 text-cyan-500 animate-pulse" />
                      Transmit Payload
                    </span>
                    <button
                      onClick={() => setOpenSendNodeId(null)}
                      className="text-slate-400 hover:text-slate-600 text-[10px]"
                    >
                      Close
                    </button>
                  </div>

                  {/* Hex input for UART/DWIN, or structured payload input */}
                  <div>
                    <label className={`block text-[10px] font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Hex Data to Send
                    </label>
                    <input
                      type="text"
                      value={hexInputByNode[node.id] || '5A A5 06 83 50 00 01 03 52'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHexInputByNode((prev) => ({ ...prev, [node.id]: val }));
                      }}
                      placeholder="e.g. 5A A5 06 83 50 00 01 03 52"
                      className={`w-full text-xs font-mono px-2.5 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>

                  {/* Editable Sample Presets Section */}
                  <div className={`p-2 rounded-lg border space-y-2 ${
                    isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-cyan-500" />
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Sample Presets ({samplePresets.length})
                        </span>
                      </div>

                      {/* Presets Management Controls: Add, Import, Export */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingPreset({ isOpen: true, preset: null })}
                          title="Add a new sample preset with parameters"
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                            isLight
                              ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200'
                              : 'bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900 border-cyan-800'
                          }`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Add</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          title="Import sample presets from a JSON file"
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                            isLight
                              ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                          }`}
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>Import</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportPresets}
                          title="Download sample presets JSON file"
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                            isLight
                              ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                          }`}
                        >
                          <Download className="w-2.5 h-2.5" />
                          <span>Export</span>
                        </button>
                      </div>
                    </div>

                    {/* Presets List with VP address and parameter values */}
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                      {samplePresets.map((preset) => {
                        const isCurrent = hexInputByNode[node.id] === preset.hex;
                        return (
                          <div
                            key={preset.id}
                            className={`flex items-center justify-between p-1.5 rounded border transition-all ${
                              isCurrent
                                ? isLight
                                  ? 'bg-cyan-50/90 border-cyan-300 shadow-2xs'
                                  : 'bg-cyan-950/60 border-cyan-700 shadow-2xs'
                                : isLight
                                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800'
                            }`}
                          >
                            {/* Preset Info (click to select and transmit) */}
                            <div
                              onClick={() => {
                                setHexInputByNode((prev) => ({ ...prev, [node.id]: preset.hex }));
                                triggerNodeSend(node.id, preset.hex);
                              }}
                              className="flex-1 min-w-0 cursor-pointer pr-1"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-medium truncate ${
                                  isCurrent ? 'text-cyan-700 dark:text-cyan-300 font-semibold' : ''
                                }`}>
                                  {preset.label}
                                </span>
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/5 dark:bg-white/5 text-slate-500 shrink-0">
                                  {preset.vpAddress}
                                </span>
                              </div>
                              <div className="text-[9px] font-mono text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                {preset.parameters.map((p) => `${p.name}: ${p.value}${p.unit ? ` ${p.unit}` : ''}`).join(' · ') || 'No params'}
                              </div>
                            </div>

                            {/* Preset Edit and Delete buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPreset({ isOpen: true, preset });
                                }}
                                title="Edit Preset (VP address, parameter names, numerical values, add/remove)"
                                className={`p-1 rounded transition-colors ${
                                  isLight
                                    ? 'hover:bg-cyan-100 text-slate-500 hover:text-cyan-800'
                                    : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-300'
                                }`}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSamplePresets((prev) => prev.filter((p) => p.id !== preset.id));
                                }}
                                title="Delete this preset"
                                className={`p-1 rounded transition-colors ${
                                  isLight
                                    ? 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                                    : 'hover:bg-rose-950/60 text-slate-500 hover:text-rose-400'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transmit & Hex Inspector Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerNodeSend(node.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-all active:scale-[0.98]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Packet 🚀</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHexInterpreterState({
                        isOpen: true,
                        hex: hexInputByNode[node.id] || '5A A5 06 83 50 00 01 03 52',
                        nodeTitle: node.title,
                        nodeId: node.id
                      })}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1 shadow-2xs transition-colors ${
                        isLight 
                          ? 'bg-white hover:bg-slate-50 text-cyan-700 border-slate-300' 
                          : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700'
                      }`}
                      title="Open Hex Code Inspector & Interpreter"
                    >
                      <Binary className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Ports Body */}
              <div className="p-2 space-y-1">
                {Array.from({
                  length: Math.max(node.inputs.length, node.outputs.length, 1),
                }).map((_, idx) => {
                  const inPort = node.inputs[idx];
                  const outPort = node.outputs[idx];

                  return (
                    <div key={idx} className="flex items-center justify-between min-h-[24px]">
                      {/* Input Port */}
                      {inPort ? (
                        <div
                          className="flex items-center gap-1.5 -ml-3.5 group cursor-pointer"
                          onMouseUp={(e) => finishConnecting(e, node.id, inPort.id)}
                          title={`Input: ${inPort.name} (${inPort.type})`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                            isLight 
                              ? 'bg-slate-200 border-slate-400 group-hover:bg-cyan-500 group-hover:border-cyan-400' 
                              : 'bg-slate-800 border-slate-600 group-hover:bg-cyan-400 group-hover:border-cyan-300'
                          }`} />
                          <span className={`text-[10px] font-medium truncate max-w-[100px] ${
                            isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-slate-200'
                          }`}>
                            {inPort.name}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* Output Port */}
                      {outPort ? (
                        <div
                          className="flex items-center gap-1.5 -mr-3.5 group cursor-crosshair ml-auto"
                          onMouseDown={(e) => {
                            const coords = getPortCoords(node.id, outPort.id, false);
                            startConnecting(e, node.id, outPort.id, coords.x, coords.y);
                          }}
                          title={`Output: ${outPort.name} (${outPort.type}) - Drag to connect`}
                        >
                          <span className={`text-[10px] font-medium truncate max-w-[100px] ${
                            isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-slate-200'
                          }`}>
                            {outPort.name}
                          </span>
                          <div className="w-3.5 h-3.5 rounded-full bg-cyan-600 border-2 border-cyan-400 group-hover:scale-125 transition-transform shadow-xs" />
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Node Footer */}
              {node.config.vpAddress && (
                <div className={`px-3 py-1 border-t rounded-b-xl text-[10px] font-mono flex items-center justify-between ${
                  isLight 
                    ? 'bg-slate-50 border-slate-100 text-cyan-700' 
                    : 'bg-slate-950/60 border-slate-800/60 text-cyan-400'
                }`}>
                  <span>VP: {node.config.vpAddress}</span>
                  <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>{node.config.endianness || 'BE'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Parameter Modal */}
      {paramModalState && (
        <EditParameterModal
          isOpen={paramModalState.isOpen}
          theme={theme}
          nodeTitle={paramModalState.nodeTitle}
          parameter={paramModalState.parameter}
          onClose={() => setParamModalState(null)}
          onSave={(paramData) => {
            if (paramModalState.parameter) {
              onUpdateParameterOnNode(paramModalState.nodeId, paramModalState.parameter.id, paramData);
            } else {
              onAddParameterToNode(paramModalState.nodeId, paramData);
            }
          }}
          onDelete={
            paramModalState.parameter
              ? () => onDeleteParameterFromNode(paramModalState.nodeId, paramModalState.parameter!.id)
              : undefined
          }
        />
      )}

      {/* Interactive Hex Code Packet Interpreter Modal */}
      {hexInterpreterState && (
        <HexInterpreterModal
          isOpen={hexInterpreterState.isOpen}
          initialHex={hexInterpreterState.hex}
          nodeTitle={hexInterpreterState.nodeTitle}
          theme={theme}
          onClose={() => setHexInterpreterState(null)}
          onSendPayload={(newPayload) => {
            triggerNodeSend(hexInterpreterState.nodeId, newPayload);
          }}
        />
      )}

      {/* Edit / Add Sample Preset Modal */}
      {editingPreset && (
        <EditPresetModal
          isOpen={editingPreset.isOpen}
          preset={editingPreset.preset}
          theme={theme}
          onClose={() => setEditingPreset(null)}
          onSave={(savedPreset) => {
            setSamplePresets((prev) => {
              const existingIndex = prev.findIndex((p) => p.id === savedPreset.id);
              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = savedPreset;
                return next;
              }
              return [...prev, savedPreset];
            });
            // Auto update active node hex if it was using this preset
            setHexInputByNode((prev) => {
              const updated = { ...prev };
              nodes.forEach((n) => {
                if (editingPreset.preset && prev[n.id] === editingPreset.preset.hex) {
                  updated[n.id] = savedPreset.hex;
                }
              });
              return updated;
            });
          }}
          onDelete={(presetId) => {
            setSamplePresets((prev) => prev.filter((p) => p.id !== presetId));
          }}
        />
      )}

      {/* Hidden file input for Importing Presets JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportPresets}
        className="hidden"
      />
    </div>
  );
};
