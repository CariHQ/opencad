import { create } from 'zustand';
import { DocumentModel, type DocumentSchema, type PropertyValue } from '@opencad/document';

interface DocumentState {
  document: DocumentSchema | null;
  model: DocumentModel | null;
  selectedIds: string[];
  activeTool: string;
  isOnline: boolean;
  isSaving: boolean;
  lastSaved: number | null;

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

  createVersion: (message?: string) => void;
  restoreVersion: (versionNumber: number) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: null,
  model: null,
  selectedIds: [],
  activeTool: 'select',
  isOnline: true,
  isSaving: false,
  lastSaved: null,

  initProject: (projectId, userId) => {
    const model = new DocumentModel(projectId, userId);
    const document = model.documentData;

    set({ document, model, lastSaved: Date.now() });
  },

  loadProject: (projectId, userId) => {
    const model = new DocumentModel(projectId, userId);
    const document = model.documentData;

    set({ document, model, lastSaved: Date.now() });
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setOnlineStatus: (online) => {
    const { model } = get();
    if (model) {
      model.setOnlineStatus(online);
    }
    set({ isOnline: online });
  },

  addLayer: (params) => {
    const { model, document } = get();
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

    set({
      document: { ...model.documentData },
      lastSaved: Date.now(),
    });
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
