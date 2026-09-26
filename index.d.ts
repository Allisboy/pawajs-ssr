import type { PawaGraph } from 'pawajs';

/** Serialized hydration node produced while rendering a page. */
export interface HydrationNode {
  id?: string;
  type?: string;
  ref?: string;
  children?: HydrationNode[];
  [key: string]: unknown;
}

/** Root hydration record returned by the SSR render operation. */
export interface HydrationTree extends HydrationNode {
  type: 'root';
  id: string;
  children: HydrationNode[];
}

/** Pawajs render graph used by the SSR renderer. */
export type ServerRenderGraph = PawaGraph;

export interface CreateServerRenderResult {
  renderGraph: PawaGraph;
  render: (element: Element) => Promise<void>;
  setRender: (
    context?: Record<string, any>,
    hydrate?: HydrationNode,
    stream?: (chunk: string) => void,
  ) => void;
}

export interface PawaServerRenderResult {
  string: string;
  hydrate: HydrationTree;
}

export interface PawaServerResult {
  render: () => Promise<PawaServerRenderResult>;
  batches: (stream: (chunk: string) => void) => Promise<void>;
  sendStripWarning: (write?: (chunk: string) => void) => string;
}

/** Enables or disables development-mode SSR error reporting. */
export function setDevelopment(enabled?: boolean): boolean;

/** Returns whether development-mode SSR error reporting is enabled. */
export function getDevelopment(): boolean;

/** Creates a renderer for a subtree and its hydration metadata. */
export function createServerRender(
  graph: PawaGraph | null,
  contexts: Record<string, any>,
  stream: (chunk: string) => void,
  hydrates: HydrationNode,
): CreateServerRenderResult;

/** Creates an SSR session for the supplied HTML and renders it when render() is called. */
export function pawaServer(
  html?: string,
  context?: Record<string, any>,
  stream?: boolean,
  development?: boolean,
): PawaServerResult;
