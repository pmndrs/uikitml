import {
  Clock,
  Color,
  Group,
  MathUtils,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { Component, Container, reversePainterSortStable } from "@pmndrs/uikit";
import { interpret, parse } from "@pmndrs/uikitml";
import * as defaultKit from "@pmndrs/uikit-default";
import * as defaultIcons from "@pmndrs/uikit-lucide";

import { PropertiesPanel } from "../ui/components";
import React from "react";
import { createInspectorContainer } from "./inspector";
import { createRoot } from "react-dom/client";
import { forwardHtmlEvents } from "@pmndrs/pointer-events";
import { isEqual } from "lodash";
import { useComponentStore } from "../ui/store";

declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

vscode.postMessage({ command: "request-content" });

let currentJson: any | undefined = undefined;

const fovY = 75;

function initializeApp() {
  // Mount React app
  const reactRoot = document.getElementById("react-root")!;
  const root = createRoot(reactRoot);

  root.render(
    React.createElement(
      "div",
      {
        id: "properties-container",
        style: {
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: "transparent",
        },
      },
      React.createElement(PropertiesPanel, { vscode })
    )
  );

  // Setup Three.js scene
  const scene = new Scene();
  scene.background = new Color(0x1d1d1d);

  // Get initial container dimensions
  const camera = new PerspectiveCamera(
    fovY,
    window.innerWidth / window.innerHeight,
    0.05,
    1000
  );
  camera.position.set(0, 0, 2.5);
  scene.add(camera);

  const renderer = new WebGLRenderer();
  renderer.setTransparentSort(reversePainterSortStable);

  // Create canvas and append to container
  const canvas = renderer.domElement;
  canvas.style.position = "absolute";
  const canvasContainer = document.getElementById("canvas-container")!;
  canvasContainer.appendChild(canvas);

  // Function to update renderer and camera based on canvas size
  const updateCanvasSize = () => {
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  };

  // Function to scale uiAnchor based on uiRoot size to fit screen with 10px margin
  const scaleToFitScreen = () => {
    if (!uiRoot || !uiRoot.size.value) {
      return;
    }

    const geomW = uiRoot.size.value[0] / 100; // Convert from pixels to world units
    const geomH = uiRoot.size.value[1] / 100;

    const W = canvasContainer.clientWidth;
    const H = canvasContainer.clientHeight;

    // Calculate available space with 10px margin
    const availableW = W - 20; // 10px margin on each side
    const availableH = H - 20; // 10px margin on top and bottom

    const vFOV = MathUtils.degToRad(camera.fov);
    const zOffset = Math.abs(camera.position.z);
    const worldHeightAtZ = 2 * Math.tan(vFOV / 2) * zOffset;
    const worldPerPixel = worldHeightAtZ / H;

    const neededW = availableW * worldPerPixel;
    const neededH = availableH * worldPerPixel;

    const scaleX = neededW / geomW;
    const scaleY = neededH / geomH;

    // Use the smaller scale to ensure everything fits with margin
    const scale = Math.min(scaleX, scaleY);

    uiAnchor.scale.setScalar(scale);
  };

  // Use ResizeObserver to watch for canvas size changes
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === canvasContainer) {
        updateCanvasSize();
        // Also rescale the UI when canvas size changes
        scaleToFitScreen();
      }
    }
  });

  // Start observing the canvas
  resizeObserver.observe(canvasContainer);

  // // Initial size update
  updateCanvasSize();

  const { update } = forwardHtmlEvents(canvas, () => camera, scene);

  renderer.setPixelRatio(window.devicePixelRatio);

  const uiAnchor = new Group();
  scene.add(uiAnchor);
  let uiRoot: Container | undefined;
  let sizeUnsubscribe: (() => void) | undefined;

  window.addEventListener("message", (event: MessageEvent) => {
    const message = event.data;
    switch (message.command) {
      case "update":
        const uijson = parse(message.text);

        const { ranges, element, classes } = uijson;

        if (uijson && !isEqual(uijson, currentJson)) {
          currentJson = uijson;

          // Get the currently selected component's ID before rebuilding
          const { selectedComponent } = useComponentStore.getState();
          const previousSelectedId =
            selectedComponent?.userData?.id ||
            (selectedComponent?.properties?.value as any)?.id;

          // Build a kit map with kebab-case aliases (e.g., RadioGroup -> radio-group)
          // const kitWithAliases: Record<string, any> = { ...(defaultKit as any) };
          const uiContent = interpret(uijson, {
            ...(defaultIcons as {}),
            ...(defaultKit as {}),
          });

          if (uiContent) {
            const componentUidMap = new Map<string, Component<any>>();
            const traverseAndMapUids = (obj: Object3D) => {
              if (obj instanceof Component) {
                const uid = obj.userData?.dataUid;
                if (uid) {
                  componentUidMap.set(uid, obj as Component<any>);
                }
              }
              for (const child of obj.children) {
                traverseAndMapUids(child);
              }
            };
            traverseAndMapUids(uiContent);

            // Unsubscribe from previous uiRoot size changes
            if (sizeUnsubscribe) {
              sizeUnsubscribe();
              sizeUnsubscribe = undefined;
            }

            if (uiRoot) {
              uiAnchor.remove(uiRoot);
              uiRoot.dispose();
            }

            uiRoot = new Container();
            const { setRootContainer, setSelectedComponent, setUikitData } =
              useComponentStore.getState();
            setRootContainer(uiContent as Component<any>);
            setUikitData({ ranges, element, classes });

            // Subscribe to size changes and perform initial scaling
            sizeUnsubscribe = uiRoot.size.subscribe(() => {
              scaleToFitScreen();
            });

            // Perform initial scaling
            scaleToFitScreen();

            // If we had a selected component, try to find and re-select it
            if (previousSelectedId) {
              const foundComponent = componentUidMap.get(previousSelectedId);
              if (foundComponent) {
                setSelectedComponent(foundComponent);
              } else {
                // Component not found, clear selection
                setSelectedComponent(null);
              }
            }

            uiAnchor.add(
              uiRoot.add(
                createInspectorContainer(uiContent, (dataUid) => {
                  vscode.postMessage({
                    command: "jump-to",
                    rangeInfo: ranges?.[dataUid],
                  });
                  // Find the component by uid and set it as selected
                  const foundComponent = componentUidMap.get(dataUid);
                  if (foundComponent) {
                    const { setSelectedComponent } =
                      useComponentStore.getState();
                    setSelectedComponent(foundComponent);
                  }
                })
              )
            );
          }
        }

        break;
    }
  });

  const clock = new Clock();

  // Button event is now handled by React component

  let isMiddleMouseDown = false;
  let lastMousePosition = { x: 0, y: 0 };
  window.addEventListener("mousedown", (event: MouseEvent) => {
    if (event.button === 1) {
      isMiddleMouseDown = true;
      lastMousePosition.x = event.clientX;
      lastMousePosition.y = event.clientY;
    }
  });
  window.addEventListener("mouseup", (event: MouseEvent) => {
    if (event.button === 1) {
      isMiddleMouseDown = false;
    }
  });
  window.addEventListener("mousemove", (event: MouseEvent) => {
    if (isMiddleMouseDown) {
      const deltaX = event.clientX - lastMousePosition.x;
      const deltaY = event.clientY - lastMousePosition.y;
      camera.position.x -= (deltaX * camera.position.z) / 400;
      camera.position.y += (deltaY * camera.position.z) / 400;
      lastMousePosition.x = event.clientX;
      lastMousePosition.y = event.clientY;
    }
  });

  function animate() {
    requestAnimationFrame(animate);
    update();
    const delta = clock.getDelta();
    uiRoot?.update(delta * 1000);
    renderer.render(scene, camera);
  }

  animate();
}

// Check if DOM is already loaded, if so run immediately, otherwise wait for DOMContentLoaded
if (document.readyState === "loading") {
  // DOM is still loading, wait for DOMContentLoaded event
  window.addEventListener("DOMContentLoaded", initializeApp);
} else {
  // DOM is already loaded (readyState is 'interactive' or 'g')
  initializeApp();
}
