import { create } from 'zustand';
import { DocumentModel, type DocumentSchema, type PropertyValue } from '@opencad/document';

interface HistoryEntry {
  document: DocumentSchema;
  timestamp: number;
  description: string;
}

interface DocumentState {
  document: DocumentSchema | null;
  model: DocumentModel | null;
  selectedIds: string[];
  activeTool: string;
  isOnline: boolean;
  isSaving: boolean;
  lastSaved: number | null;

  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  initProject: (projectId: string, userId: string) => void;
  loadProject: (projectId: string, userId: string) => void;
  setSelectedIds: (ids: string[]) => void;
  setActiveTool: (tool: string) => void;
  setOnlineStatus: (online: boolean) => void;

  addLayer: (params: { name: string; color: string }) => string;
  updateLayer: (layerId: string, updates: Record<string, unknown>) => void;
  deleteLayer: (layerId: string) => void;

  addElement: (params: {
    type: string;
    layerId: string;
    properties?: Record<string, unknown>;
  }) => string;
  updateElement: (elementId: string, updates: Record<string, unknown>) => void;
  deleteElement: (elementId: string) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  createVersion: (message?: string) => void;
  restoreVersion: (versionNumber: number) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: null,
  model: null,
  selectedIds: [],
  activeTool: (() => {
    try { return localStorage.getItem('opencad-activeTool') ?? 'select'; } catch { return 'select'; }
  })(),
  isOnline: true,
  isSaving: false,
  lastSaved: null,

  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  initProject: (projectId, userId) => {
    let model: DocumentModel;
    try {
      const saved = localStorage.getItem('opencad-document');
      if (saved) {
        const docData = JSON.parse(saved);
        model = new DocumentModel(projectId, userId);
        model.loadDocument(docData);
      } else {
        model = new DocumentModel(projectId, userId);
      }
    } catch {
      model = new DocumentModel(projectId, userId);
    }
    const document = model.documentData;

    set({
      document,
      model,
      lastSaved: Date.now(),
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,
    });
  },

  loadProject: (projectId, userId) => {
    const model = new DocumentModel(projectId, userId);
    const document = model.documentData;

    set({
      document,
      model,
      lastSaved: Date.now(),
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,
    });
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  setActiveTool: (tool) => {
    try { localStorage.setItem('opencad-activeTool', tool); } catch { /* ignore */ }
    set({ activeTool: tool });
  },

  setOnlineStatus: (online) => {
    const { model } = get();
    if (model) {
      model.setOnlineStatus(online);
    }
    set({ isOnline: online });
  },

  addLayer: (params) => {
    const { model } = get();
    if (!model) throw new Error('No document loaded');

    const layerId = model.addLayer(params);
    set({
      document: { ...model.documentData },
      lastSaved: Date.now(),
    });
    return layerId;
  },

  updateLayer: (layerId, updates) => {
    const { model } = get();
    if (!model) return;

    model.updateLayer(layerId, updates as Record<string, unknown>);
    set({ document: { ...model.documentData } });
  },

  deleteLayer: (layerId) => {
    const { model } = get();
    if (!model) return;

    model.deleteLayer(layerId);
    set({ document: { ...model.documentData } });
  },

  addElement: (params) => {
    const { model } = get();
    if (!model) throw new Error('No document loaded');

    const elementId = model.addElement({
      type: params.type as 'wall' | 'door' | 'window' | 'slab',
      layerId: params.layerId,
      properties: params.properties as Record<string, PropertyValue>,
    });

    const newDoc = { ...model.documentData };
    set({
      document: newDoc,
      lastSaved: Date.now(),
    });
    try {
      localStorage.setItem('opencad-document', JSON.stringify(newDoc));
    } catch {}
    return elementId;
  },

  updateElement: (elementId, updates) => {
    const { model } = get();
    if (!model) return;

    const element = model.getElementById(elementId);
    if (element) {
      Object.assign(element, updates);
      set({ document: { ...model.documentData } });
    }
  },

  deleteElement: (elementId) => {
    const { model, document } = get();
    if (!model || !document) return;

    delete document.elements[elementId];
    set({
      document: { ...document },
      lastSaved: Date.now(),
    });
  },

  pushHistory: (description) => {
    const { document, history, historyIndex } = get();
    if (!document) return;

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      document: JSON.parse(JSON.stringify(document)),
      timestamp: Date.now(),
      description,
    });

    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    set({
      document: JSON.parse(JSON.stringify(history[newIndex].document)),
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    set({
      document: JSON.parse(JSON.stringify(history[newIndex].document)),
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < history.length - 1,
    });
  },

  createVersion: (message) => {
    const { model } = get();
    if (!model) return;

    model.createVersion(message);
    set({ document: { ...model.documentData } });
  },

  restoreVersion: (versionNumber) => {
    const { model } = get();
    if (!model) return;

    model.restoreVersion(versionNumber);
    set({ document: { ...model.documentData } });
  },
}));
