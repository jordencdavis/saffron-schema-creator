import { ProjectConfig, ValidationDiagnostic } from '../types';
import { normalizeHex } from './schemaInference';

export function runValidation(project: ProjectConfig): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];

  // 1. Tier 1: Node Validation
  for (const node of project.nodes) {
    if (node.type === 'hex_decoder') {
      if (!node.config.frameHeader || node.config.frameHeader.length < 2) {
        diagnostics.push({
          id: `diag-node-${node.id}-1`,
          tier: 'node',
          severity: 'error',
          targetId: node.id,
          targetName: node.title,
          title: 'Missing Frame Header',
          description: 'Hex decoder node requires a frame sync header (e.g. 5AA5).',
          expected: '2-4 character hex sync word',
          actual: String(node.config.frameHeader || 'empty'),
          suggestedCorrection: 'Set Frame Header to "5AA5" in the Properties Panel.',
          canContinue: false,
        });
      }
    }

    if (node.type === 'source' || node.type === 'destination') {
      const boundIf = project.interfaces.find((i) => i.id === node.interfaceId);
      if (!boundIf) {
        diagnostics.push({
          id: `diag-node-${node.id}-2`,
          tier: 'node',
          severity: 'error',
          targetId: node.id,
          targetName: node.title,
          title: 'Unbound Interface Node',
          description: `Node '${node.title}' is not associated with any valid interface.`,
          suggestedCorrection: 'Select a valid interface in the Properties Inspector.',
          canContinue: false,
        });
      }
    }

    // Check if node has inputs but no incoming connection (except sources)
    if (node.type !== 'source' && node.inputs.length > 0) {
      const hasIncoming = project.connections.some((c) => c.targetNodeId === node.id);
      if (!hasIncoming) {
        diagnostics.push({
          id: `diag-node-${node.id}-3`,
          tier: 'node',
          severity: 'warning',
          targetId: node.id,
          targetName: node.title,
          title: 'Disconnected Input Ports',
          description: `Node '${node.title}' has declared input ports but no incoming wire connection.`,
          suggestedCorrection: 'Drag an output wire from the upstream stage onto this node.',
          canContinue: true,
        });
      }
    }
  }

  // 2. Tier 2: Connection Validation
  for (const conn of project.connections) {
    const srcNode = project.nodes.find((n) => n.id === conn.sourceNodeId);
    const tgtNode = project.nodes.find((n) => n.id === conn.targetNodeId);

    if (!srcNode || !tgtNode) {
      diagnostics.push({
        id: `diag-conn-${conn.id}-1`,
        tier: 'connection',
        severity: 'error',
        targetId: conn.id,
        targetName: `Connection ${conn.id}`,
        title: 'Dangling Connection Wire',
        description: 'Connection references missing source or target node.',
        canContinue: false,
      });
      continue;
    }

    if (!conn.mappings || conn.mappings.length === 0) {
      diagnostics.push({
        id: `diag-conn-${conn.id}-2`,
        tier: 'connection',
        severity: 'warning',
        targetId: conn.id,
        targetName: `${srcNode.title} → ${tgtNode.title}`,
        title: 'No Explicit Field Mappings',
        description: 'Connection wire exists without explicit mapping contracts. Unmapped payload will pass as unvalidated generic object.',
        suggestedCorrection: 'Click connection wire to define explicit field contracts.',
        canContinue: true,
      });
    }

    // Check mapping type compatibility
    conn.mappings?.forEach((mapping, idx) => {
      if (mapping.transformRule === 'scale' && !mapping.scaleMultiplier) {
        diagnostics.push({
          id: `diag-conn-${conn.id}-scale-${idx}`,
          tier: 'connection',
          severity: 'warning',
          targetId: conn.id,
          targetName: `${srcNode.title} → ${tgtNode.title}`,
          title: 'Undefined Scale Multiplier',
          description: `Mapping '${mapping.sourceField}' uses scale rule without multiplier. Defaulting to 1.0.`,
          canContinue: true,
        });
      }
    });
  }

  // 3. Tier 3: Sample Validation
  for (const iface of project.interfaces) {
    const activeSample = iface.samples.find((s) => s.id === iface.activeSampleId);
    if (!activeSample) {
      diagnostics.push({
        id: `diag-sample-${iface.id}-1`,
        tier: 'sample',
        severity: 'error',
        targetId: iface.id,
        targetName: iface.name,
        title: 'No Active Sample Selected',
        description: `Interface '${iface.name}' has no active representative sample for simulation.`,
        suggestedCorrection: 'Select or add a sample in the Interface card.',
        canContinue: false,
      });
      continue;
    }

    if (!activeSample.rawPayload.trim()) {
      diagnostics.push({
        id: `diag-sample-${iface.id}-2`,
        tier: 'sample',
        severity: 'error',
        targetId: iface.id,
        targetName: iface.name,
        title: 'Empty Raw Sample Payload',
        description: `Sample '${activeSample.name}' contains empty payload text.`,
        suggestedCorrection: 'Paste representative hex or structured text into the editor.',
        canContinue: false,
      });
    }

    if (activeSample.format === 'hex') {
      const bytes = normalizeHex(activeSample.rawPayload);
      if (bytes.length < 4) {
        diagnostics.push({
          id: `diag-sample-${iface.id}-hex`,
          tier: 'sample',
          severity: activeSample.isMalformed ? 'warning' : 'error',
          targetId: iface.id,
          targetName: iface.name,
          title: activeSample.isMalformed ? 'Known Malformed Hex Sample' : 'Truncated Hex Packet',
          description: `Sample '${activeSample.name}' has only ${bytes.length} bytes. Standard UART frames require >= 6 bytes.`,
          expected: '>= 6 bytes',
          actual: `${bytes.length} bytes`,
          suggestedCorrection: activeSample.isMalformed ? 'This fixture is expected to fail decoder validation' : 'Verify UART serial monitor capture',
          canContinue: true,
        });
      }
    }

    if (activeSample.format === 'json') {
      try {
        JSON.parse(activeSample.rawPayload);
      } catch (e) {
        diagnostics.push({
          id: `diag-sample-${iface.id}-json`,
          tier: 'sample',
          severity: 'error',
          targetId: iface.id,
          targetName: iface.name,
          title: 'JSON Syntax Error',
          description: `Sample '${activeSample.name}' contains invalid JSON: ${(e as Error).message}`,
          suggestedCorrection: 'Format and correct JSON syntax in the sample editor.',
          canContinue: false,
        });
      }
    }
  }

  // 4. Tier 4: End-to-End Validation
  const sourceNodes = project.nodes.filter((n) => n.type === 'source');
  const destNodes = project.nodes.filter((n) => n.type === 'destination');

  if (sourceNodes.length === 0) {
    diagnostics.push({
      id: 'diag-e2e-no-src',
      tier: 'end_to_end',
      severity: 'error',
      targetId: 'pipeline',
      targetName: 'Global Pipeline',
      title: 'Missing Ingestion Source Node',
      description: 'The flow has no source interface node to inject raw samples.',
      suggestedCorrection: 'Add a Source Node representing Interface 1 (UART/HEX).',
      canContinue: false,
    });
  }

  if (destNodes.length === 0) {
    diagnostics.push({
      id: 'diag-e2e-no-dst',
      tier: 'end_to_end',
      severity: 'warning',
      targetId: 'pipeline',
      targetName: 'Global Pipeline',
      title: 'No Output Sinks',
      description: 'Flow does not route to any destination interface.',
      suggestedCorrection: 'Add destination nodes for Firebase RTDB, GUI, or CSV Logger.',
      canContinue: true,
    });
  }

  // Check canonical CO2 parameter coverage
  const co2Param = project.canonicalParameters.find((p) => p.id === 'climate.co2');
  if (co2Param) {
    const boundInterfaces = new Set(co2Param.knownBindings.map((b) => b.interfaceId));
    if (boundInterfaces.size < 3) {
      diagnostics.push({
        id: 'diag-e2e-co2-coverage',
        tier: 'end_to_end',
        severity: 'info',
        targetId: 'climate.co2',
        targetName: 'Canonical Registry',
        title: 'Partial Parameter Lineage',
        description: `Parameter 'climate.co2' is bound across ${boundInterfaces.size} of ${project.interfaces.length} interfaces.`,
        suggestedCorrection: 'Map remaining interfaces in the Cross-Interface Field Matching tab.',
        canContinue: true,
      });
    }
  }

  return diagnostics;
}
