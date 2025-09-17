import { Component } from "@pmndrs/uikit";
import { useComponentStore } from "../ui/store";

export interface PropertyChange {
  key: string;
  value: any;
}

export interface VSCodeApi {
  postMessage: (message: any) => void;
}

export class PropertyEditor {
  private component: Component<any> | null = null;

  constructor(private vscode: VSCodeApi) {}

  setComponent(component: Component<any> | null) {
    this.component = component;
  }

  getComponent(): Component<any> | null {
    return this.component;
  }

  updateProperty(key: string, value: any): void {
    if (!this.component) {
      return;
    }

    // Initialize userData.originalValues if it doesn't exist
    if (!this.component.userData) {
      this.component.userData = {};
    }
    if (!this.component.userData.originalValues) {
      this.component.userData.originalValues = {};
    }

    const currentValue = (this.component.properties.value as any)[key];
    const originalValues = this.component.userData.originalValues;

    // Store original value if this is the first change
    if (!(key in originalValues)) {
      originalValues[key] = currentValue;
    }

    // Update the component property
    this.component.setProperties({ [key]: value });

    // If the new value equals the original value, remove the original value entry
    if (value === originalValues[key]) {
      delete originalValues[key];
    }
  }

  resetChanges(): void {
    if (!this.component || !this.component.userData?.originalValues) {
      return;
    }

    const originalValues = this.component.userData.originalValues;
    const resetProps: Record<string, any> = {};

    // Reset all properties that have original values
    Object.keys(originalValues).forEach((key) => {
      resetProps[key] = originalValues[key];
    });

    // Update the component with reset values
    this.component.setProperties(resetProps);

    // Clear all original values since we've reset everything
    this.component.userData.originalValues = {};
  }

  applyChanges(): void {
    if (!this.component || !this.component.userData?.originalValues) {
      return;
    }

    const originalValues = this.component.userData.originalValues;
    const changes: Record<string, any> = {};

    // Build changes object from current properties vs original values
    Object.keys(originalValues).forEach((key) => {
      changes[key] = (this.component!.properties.value as any)[key];
    });

    if (Object.keys(changes).length === 0) {
      return;
    }

    // Get component identification for targeting the edit
    const componentId = this.component.userData.dataUid;

    const { ranges } = useComponentStore.getState();
    const rangeInfo = ranges?.[componentId];

    // Send all pending changes to extension
    this.vscode.postMessage({
      command: "apply-changes",
      changedProperties: changes,
      rangeInfo: rangeInfo,
    });

    // Clear original values since changes have been applied
    this.component.userData.originalValues = {};
  }

  hasPendingChanges(): boolean {
    return (
      (this.component?.userData?.originalValues &&
        Object.keys(this.component.userData.originalValues).length > 0) ||
      false
    );
  }

  getOriginalValue(key: string): any {
    return this.component?.userData?.originalValues?.[key];
  }

  getPropertyValue(key: string): any {
    if (!this.component) {
      return undefined;
    }
    return (this.component.properties.value as any)[key];
  }

  getComponentId(): string {
    if (!this.component) {
      return "";
    }
    return (
      this.component.userData?.id ||
      (this.component.properties.value as any)?.id ||
      ""
    );
  }

  getComponentClass(): string {
    if (!this.component) {
      return "";
    }
    return (this.component.properties.value as any)?.class || "";
  }

  jumpToId(): void {
    const componentId = this.getComponentId();
    if (componentId) {
      const { ranges } = useComponentStore.getState();
      const rangeInfo = ranges?.[`__id__${componentId}`];
      this.vscode.postMessage({
        command: "jump-to",
        rangeInfo: rangeInfo,
      });
    }
  }

  jumpToClass(className: string): void {
    const { ranges } = useComponentStore.getState();
    const rangeInfo = ranges?.[className];
    this.vscode.postMessage({
      command: "jump-to",
      rangeInfo: rangeInfo,
    });
  }
}
