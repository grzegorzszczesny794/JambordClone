import { ShapeTool } from "./shape-tool";

interface ShapeAction {
  tool: ShapeTool;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
}

export type { ShapeAction }
