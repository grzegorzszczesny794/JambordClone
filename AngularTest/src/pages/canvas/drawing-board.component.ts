import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from "@angular/core";

interface PastedImage {
  id: number;
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawingAction {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
}

type Action =
  | { type: 'draw'; lines: DrawingAction[] }
  | { type: 'paste'; image: PastedImage }
  | { type: 'move'; imageId: number; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'resize'; imageId: number; fromWidth: number; fromHeight: number; toWidth: number; toHeight: number };

@Component({
  selector: 'app-drawing-board',
  templateUrl: './drawing-board.component.html',
  styles: [`
    canvas {
      border: 1px solid #000;
    }
  `]
})
export class DrawingBoardComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  lineWidth = 2;
  strokeStyle = '#000000';

  private pastedImages: PastedImage[] = [];
  private actions: Action[] = [];
  private currentDrawingAction: DrawingAction[] = [];
  private selectedImage: PastedImage | null = null;
  private isDragging = false;
  private isResizing = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private nextImageId = 1;
  private lastMoveAction: Action | null = null;
  private lastResizeAction: Action | null = null;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
    this.redrawCanvas();
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) this.pasteImage(blob);
        break;
      }
    }
  }

  private pasteImage(blob: Blob) {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const img = new Image();
      img.onload = () => {
        const canvas = this.canvasRef.nativeElement;
        const scale = Math.min(canvas.width / 2 / img.width, canvas.height / 2 / img.height, 1);
        const width = img.width * scale;
        const height = img.height * scale;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;

        const pastedImage: PastedImage = { id: this.nextImageId++, img, x, y, width, height };
        this.pastedImages.push(pastedImage);
        this.actions.push({ type: 'paste', image: pastedImage });
        this.redrawCanvas();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(blob);
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 100;
  }

  private redrawCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.pastedImages = [];
    for (const action of this.actions) {
      switch (action.type) {
        case 'paste':
          this.pastedImages.push(action.image);
          break;
        case 'move':
          const movedImage = this.pastedImages.find(img => img.id === action.imageId);
          if (movedImage) {
            movedImage.x = action.toX;
            movedImage.y = action.toY;
          }
          break;
        case 'resize':
          const resizedImage = this.pastedImages.find(img => img.id === action.imageId);
          if (resizedImage) {
            resizedImage.width = action.toWidth;
            resizedImage.height = action.toHeight;
          }
          break;
        case 'draw':
          for (const line of action.lines) {
            this.drawLine(line);
          }
          break;
      }
    }

    for (const img of this.pastedImages) {
      this.ctx.drawImage(img.img, img.x, img.y, img.width, img.height);
    }
  }

  private drawLine(line: DrawingAction) {
    this.ctx.beginPath();
    this.ctx.moveTo(line.startX, line.startY);
    this.ctx.lineTo(line.endX, line.endY);
    this.ctx.strokeStyle = line.color;
    this.ctx.lineWidth = line.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.selectedImage = this.pastedImages.find(img =>
      x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height
    ) || null;

    if (this.selectedImage) {
      this.isDragging = true;
      this.dragStartX = x - this.selectedImage.x;
      this.dragStartY = y - this.selectedImage.y;

      const cornerSize = 20;
      if (x >= this.selectedImage.x + this.selectedImage.width - cornerSize &&
        y >= this.selectedImage.y + this.selectedImage.height - cornerSize) {
        this.isResizing = true;
      }
    } else {
      this.isDrawing = true;
      [this.lastX, this.lastY] = [x, y];
      this.currentDrawingAction = [];
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.isDragging && this.selectedImage && !this.isResizing) {
      const fromX = this.selectedImage.x;
      const fromY = this.selectedImage.y;
      this.selectedImage.x = x - this.dragStartX;
      this.selectedImage.y = y - this.dragStartY;

      if (this.lastMoveAction && this.lastMoveAction.type === 'move' && this.lastMoveAction.imageId === this.selectedImage.id) {
        this.lastMoveAction.toX = this.selectedImage.x;
        this.lastMoveAction.toY = this.selectedImage.y;
      } else {
        this.lastMoveAction = {
          type: 'move',
          imageId: this.selectedImage.id,
          fromX,
          fromY,
          toX: this.selectedImage.x,
          toY: this.selectedImage.y
        };
        this.actions.push(this.lastMoveAction);
      }
      this.redrawCanvas();
    } else if (this.isResizing && this.selectedImage) {
      const newWidth = x - this.selectedImage.x;
      const newHeight = y - this.selectedImage.y;
      const aspectRatio = this.selectedImage.img.width / this.selectedImage.img.height;

      const fromWidth = this.selectedImage.width;
      const fromHeight = this.selectedImage.height;

      if (newWidth / newHeight > aspectRatio) {
        this.selectedImage.width = newHeight * aspectRatio;
        this.selectedImage.height = newHeight;
      } else {
        this.selectedImage.width = newWidth;
        this.selectedImage.height = newWidth / aspectRatio;
      }

      if (this.lastResizeAction && this.lastResizeAction.type === 'resize' && this.lastResizeAction.imageId === this.selectedImage.id) {
        this.lastResizeAction.toWidth = this.selectedImage.width;
        this.lastResizeAction.toHeight = this.selectedImage.height;
      } else {
        this.lastResizeAction = {
          type: 'resize',
          imageId: this.selectedImage.id,
          fromWidth,
          fromHeight,
          toWidth: this.selectedImage.width,
          toHeight: this.selectedImage.height
        };
        this.actions.push(this.lastResizeAction);
      }
      this.redrawCanvas();
    } else if (this.isDrawing) {
      this.draw(x, y);
    }
  }

  @HostListener('mouseup')
  onMouseUp() {
    if (this.isDrawing && this.currentDrawingAction.length > 0) {
      this.actions.push({ type: 'draw', lines: this.currentDrawingAction });
      this.currentDrawingAction = [];
    }
    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.lastMoveAction = null;
    this.lastResizeAction = null;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.onMouseUp();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Sprawdź, czy naciśnięto Ctrl+Z (Windows/Linux) lub Cmd+Z (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault(); // Zapobiega domyślnej akcji przeglądarki
      this.undo();
    }
  }

  private draw(x: number, y: number) {
    const drawingAction: DrawingAction = {
      startX: this.lastX,
      startY: this.lastY,
      endX: x,
      endY: y,
      color: this.strokeStyle,
      lineWidth: this.lineWidth
    };

    this.drawLine(drawingAction);
    this.currentDrawingAction.push(drawingAction);

    [this.lastX, this.lastY] = [x, y];
  }

  clearCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.pastedImages = [];
    this.actions = [];
  }

  changeColor(event: Event) {
    this.strokeStyle = (event.target as HTMLInputElement).value;
  }

  undo() {
    if (this.actions.length > 0) {
      this.actions.pop();
      this.redrawCanvas();
    }
  }
}
