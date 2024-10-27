import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from "@angular/core";
import { PastedImage } from "../../models/pasted-image";
import { DrawingAction } from "../../models/drawing-action";
import { ShapeAction } from "../../models/shape-action";
import { ShapeTool } from "../../models/shape-tool";
import { Action } from "../../models/action";


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

  currentTool: ShapeTool = 'freehand';
  private tempCanvas!: HTMLCanvasElement;
  private tempCtx!: CanvasRenderingContext2D;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();

    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d')!;
    this.resizeTempCanvas();
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 100;
    this.resizeTempCanvas();
  }

  private resizeTempCanvas() {
    this.tempCanvas.width = this.canvasRef.nativeElement.width;
    this.tempCanvas.height = this.canvasRef.nativeElement.height;
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

  private redrawCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    const updatedImages: { [key: number]: PastedImage } = {};

    for (const action of this.actions) {
      switch (action.type) {
        case 'draw':
          for (const line of action.lines) {
            this.drawLine(line);
          }
          break;
        case 'paste':
          updatedImages[action.image.id] = { ...action.image };
          break;
        case 'move':
          if (updatedImages[action.imageId]) {
            updatedImages[action.imageId].x = action.toX;
            updatedImages[action.imageId].y = action.toY;
          }
          break;
        case 'resize':
          if (updatedImages[action.imageId]) {
            updatedImages[action.imageId].width = action.toWidth;
            updatedImages[action.imageId].height = action.toHeight;
          }
          break;
        case 'shape':
          this.drawShape(action.shape);
          break;
      }
    }

    this.pastedImages = Object.values(updatedImages);
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

  private drawShape(shape: ShapeAction) {
    this.ctx.strokeStyle = shape.color;
    this.ctx.lineWidth = shape.lineWidth;
    this.ctx.beginPath();

    switch (shape.tool) {
      case 'line':
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX, shape.endY);
        break;
      case 'rectangle':
        this.ctx.rect(shape.startX, shape.startY, shape.endX - shape.startX, shape.endY - shape.startY);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2));
        this.ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
        break;
    }

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

    if (this.isDragging
      && this.selectedImage
      && !this.isResizing) {
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

      if (this.lastResizeAction
          && this.lastResizeAction.type === 'resize'
          && this.lastResizeAction.imageId === this.selectedImage.id) {
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
      if (this.currentTool === 'freehand') {
        this.draw(x, y);
      } else {
        this.drawTempShape(x, y);
      }
    }
  }

  private drawTempShape(x: number, y: number) {
    this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
    this.tempCtx.strokeStyle = this.strokeStyle;
    this.tempCtx.lineWidth = this.lineWidth;
    this.tempCtx.beginPath();

    switch (this.currentTool) {
      case 'line':
        this.tempCtx.moveTo(this.lastX, this.lastY);
        this.tempCtx.lineTo(x, y);
        break;
      case 'rectangle':
        this.tempCtx.rect(this.lastX, this.lastY, x - this.lastX, y - this.lastY);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(x - this.lastX, 2) + Math.pow(y - this.lastY, 2));
        this.tempCtx.arc(this.lastX, this.lastY, radius, 0, 2 * Math.PI);
        break;
    }

    this.tempCtx.stroke();
    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    this.redrawCanvas();
    this.ctx.drawImage(this.tempCanvas, 0, 0);
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.isDrawing) {
      if (this.currentTool === 'freehand' && this.currentDrawingAction.length > 0) {
        this.actions.push({ type: 'draw', lines: this.currentDrawingAction });
      } else if (this.currentTool !== 'freehand') {
        const canvas = this.canvasRef.nativeElement;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.actions.push({
          type: 'shape',
          shape: {
            tool: this.currentTool,
            startX: this.lastX,
            startY: this.lastY,
            endX: x,
            endY: y,
            color: this.strokeStyle,
            lineWidth: this.lineWidth
          }
        });
        this.redrawCanvas();
      }
    }
    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.lastMoveAction = null;
    this.lastResizeAction = null;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.onMouseUp(new MouseEvent('mouseup'));
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
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
