import { create } from 'zustand';
import { Component } from '@pmndrs/uikit';

export type KitName = 'uikit-default' | 'uikit-lucide' | 'uikit-horizon';

interface ComponentStore {
  selectedComponent: Component<any> | null;
  rootContainer: Component<any> | null;
  ranges: Record<string, any> | null;
  element: any | null;
  classes: Record<string, any> | null;
  selectedKits: KitName[];
  setSelectedComponent: (component: Component<any> | null) => void;
  setRootContainer: (component: Component<any> | null) => void;
  setUikitData: (data: { ranges: Record<string, any> | null; element: any | null; classes: Record<string, any> | null; }) => void;
  setSelectedKits: (kits: KitName[]) => void;
}

export const useComponentStore = create<ComponentStore>((set) => ({
  selectedComponent: null,
  rootContainer: null,
  ranges: null,
  element: null,
  classes: null,
  selectedKits: ['uikit-horizon', 'uikit-lucide'],
  setSelectedComponent: (component) => set({ selectedComponent: component }),
  setRootContainer: (component) => set({ rootContainer: component }),
  setUikitData: (data) => set({
    ranges: data.ranges,
    element: data.element,
    classes: data.classes
  }),
  setSelectedKits: (kits) => set({ selectedKits: kits }),
}));