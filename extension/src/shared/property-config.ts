export interface PropertyConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "color";
  options?: string[];
}

// Property configuration
export const propertyConfigs: PropertyConfig[] = [
  { key: "width", label: "Width" },
  { key: "height", label: "Height" },
  { key: "paddingTop", label: "Padding", type: "number" },
  { key: "marginTop", label: "Margin", type: "number" },
  { 
    key: "display", 
    label: "Display", 
    type: "select", 
    options: ["flex", "none", "contents"] 
  },
  { 
    key: "flexDirection", 
    label: "Direction", 
    type: "select", 
    options: ["row", "row-reverse", "column", "column-reverse"] 
  },
  { 
    key: "justifyContent", 
    label: "Justify", 
    type: "select", 
    options: ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"] 
  },
  { 
    key: "alignItems", 
    label: "Align", 
    type: "select", 
    options: ["flex-start", "center", "flex-end", "stretch", "baseline"] 
  },
  { key: "backgroundColor", label: "BG Color", type: "color" },
  { key: "color", label: "Color", type: "color" },
  { key: "fontSize", label: "Font Size", type: "number" },
  { 
    key: "fontWeight", 
    label: "Font Weight", 
    type: "select", 
    options: ["100", "200", "300", "400", "500", "600", "700", "800", "900", "normal", "bold"] 
  },
  { key: "opacity", label: "Opacity", type: "number" },
  { key: "borderColor", label: "Border Color", type: "color" },
  { key: "borderWidth", label: "Border Width", type: "number" },
  { key: "borderTopLeftRadius", label: "Radius TL", type: "number" },
  { key: "borderTopRightRadius", label: "Radius TR", type: "number" },
  { key: "borderBottomLeftRadius", label: "Radius BL", type: "number" },
  { key: "borderBottomRightRadius", label: "Radius BR", type: "number" },
  { 
    key: "positionType", 
    label: "Position", 
    type: "select", 
    options: ["static", "relative", "absolute"] 
  },
  { key: "positionTop", label: "Top" },
  { key: "positionLeft", label: "Left" },
  { key: "positionRight", label: "Right" },
];