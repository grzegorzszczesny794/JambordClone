import { DrawingAction } from "./drawing-action";
import { PastedImage } from "./pasted-image";
import { ShapeAction } from "./shape-action";

type Action =
  | { type: 'draw'; lines: DrawingAction[] }
  | { type: 'paste'; image: PastedImage }
  | { type: 'move'; imageId: number; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'resize'; imageId: number; fromWidth: number; fromHeight: number; toWidth: number; toHeight: number }
  | { type: 'shape'; shape: ShapeAction };


export type { Action }
