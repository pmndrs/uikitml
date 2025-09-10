import { Component, Container } from "@pmndrs/uikit";
import { Euler, Matrix4, Object3D, Quaternion, Vector3 } from "three";

import { computed } from "@preact/signals-core";

const matrixHelper = new Matrix4();
const quaternionHelper = new Quaternion();

function findUid(object: Object3D): string | undefined {
  let currentObject: Object3D | null = object;
  while (currentObject) {
    if (currentObject.userData && currentObject.userData.dataUid) {
      return currentObject.userData.dataUid;
    }
    currentObject = currentObject.parent;
  }
  return undefined;
}

export const createInspectorContainer = (
  children: Object3D,
  onElementClick: (uid: string) => void
) => {
  const inspectorContainer = new Container({
    width: "100%",
    height: "100%",
  });
  const highlightContainer = new Container({
    visibility: "hidden",
    pointerEvents: "none",
    positionType: "absolute",
    positionLeft: "50%",
    positionTop: "50%",
    zIndexOffset: 20,
    borderColor: "red",
    borderWidth: computed(
      () => (inspectorContainer.size.value?.[0] ?? 0) * 0.005
    ),
  });
  const selectedContainer = new Container({
    visibility: "hidden",
    pointerEvents: "none",
    positionType: "absolute",
    positionLeft: "50%",
    positionTop: "50%",
    zIndexOffset: 19,
    borderColor: "yellow",
    borderWidth: computed(
      () => (inspectorContainer.size.value?.[0] ?? 0) * 0.0035
    ),
  });
  inspectorContainer.add(children, highlightContainer, selectedContainer);
  inspectorContainer.addEventListener("pointerover", (e) => {
    if (!e.object || !(e.object instanceof Component)) {
      return;
    }
    const { globalMatrix, size } = e.object as Component;
    const transformation = computed(() => {
      const { value } = globalMatrix;
      if (!value) {
        return {
          translation: new Vector3(),
          scale: new Vector3(),
          rotation: new Euler(),
        };
      }
      matrixHelper.copy(value);
      const translation = new Vector3();
      const scale = new Vector3();
      matrixHelper.decompose(translation, quaternionHelper, scale);
      const rotation = new Euler().setFromQuaternion(quaternionHelper);
      return { translation, scale, rotation };
    });
    const width = computed(
      () => transformation.value.scale.x * (size.value?.[0] ?? 0)
    );
    const height = computed(
      () => transformation.value.scale.y * (size.value?.[1] ?? 0) * 1
    );
    const pixelSize = (e.object as Component).properties.value.pixelSize;
    highlightContainer.setProperties({
      visibility: "visible",
      transformTranslateX: computed(
        () => transformation.value.translation.x / pixelSize - 0.5 * width.value
      ),
      transformTranslateY: computed(
        () =>
          -transformation.value.translation.y / pixelSize - 0.5 * height.value
      ),
      transformTranslateZ: computed(
        () => transformation.value.translation.z / pixelSize
      ),

      transformScaleZ: computed(() => transformation.value.scale.z),
      transformRotateX: computed(() => transformation.value.rotation.x),
      transformRotateZ: computed(() => transformation.value.rotation.y),
      transformRotateY: computed(() => transformation.value.rotation.z),
      width,
      height,
    });
  });
  inspectorContainer.addEventListener("pointerleave", () => {
    highlightContainer.setProperties({ visibility: "hidden" });
  });
  inspectorContainer.addEventListener("click", (e) => {
    if (!e.object || !(e.object instanceof Component)) {
      return;
    }
    const uid = findUid(e.object);
    if (uid) {
      onElementClick(uid);
    }

    const { globalMatrix, size } = e.object as Component;
    const transformation = computed(() => {
      const { value } = globalMatrix;
      if (!value) {
        return {
          translation: new Vector3(),
          scale: new Vector3(),
          rotation: new Euler(),
        };
      }
      matrixHelper.copy(value);
      const translation = new Vector3();
      const scale = new Vector3();
      matrixHelper.decompose(translation, quaternionHelper, scale);
      const rotation = new Euler().setFromQuaternion(quaternionHelper);
      return { translation, scale, rotation };
    });
    const width = computed(
      () => transformation.value.scale.x * (size.value?.[0] ?? 0)
    );
    const height = computed(
      () => transformation.value.scale.y * (size.value?.[1] ?? 0) * 1
    );
    const pixelSize = (e.object as Component).properties.value.pixelSize;
    selectedContainer.setProperties({
      visibility: "visible",
      transformTranslateX: computed(
        () => transformation.value.translation.x / pixelSize - 0.5 * width.value
      ),
      transformTranslateY: computed(
        () =>
          -transformation.value.translation.y / pixelSize - 0.5 * height.value
      ),
      transformTranslateZ: computed(
        () => transformation.value.translation.z / pixelSize
      ),

      transformScaleZ: computed(() => transformation.value.scale.z),
      transformRotateX: computed(() => transformation.value.rotation.x),
      transformRotateZ: computed(() => transformation.value.rotation.y),
      transformRotateY: computed(() => transformation.value.rotation.z),
      width,
      height,
    });
  });

  return inspectorContainer;
};
