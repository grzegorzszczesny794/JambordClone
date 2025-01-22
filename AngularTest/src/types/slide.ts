import { Action } from "./action";
import { PastedImage } from "./pasted-image";

interface Slide {
  id: number;
  actions: Action[];
  pastedImages: PastedImage[];
}

export type { Slide }
