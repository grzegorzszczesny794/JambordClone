import { Component, ViewChild, ViewChildren, QueryList, AfterViewInit, HostListener } from '@angular/core';
import { SlideComponent } from '../drawing-board/drawing-board.component';
import { Slide } from '../../types/slide';
import { ShapeTool } from '../../types/shape-tool';


@Component({
  selector: 'app-drawing-board',
  template: `
    <div class="drawing-board">
      <div class="slides-container">
        <app-slide
          *ngFor="let slide of slides; let i = index"
          [slide]="slide"
          [isActive]="currentSlideIndex === i"
          [currentTool]="currentTool"
          [lineWidth]="lineWidth"
        [strokeStyle]="strokeStyle"
          (slideChanged)="onSlideChanged($event)"
          [style.display]="currentSlideIndex === i ? 'block' : 'none'"
        ></app-slide>
      </div>

      <div class="controls">
        <div class="drawing-controls">
          <button (click)="clearCurrentSlide()">Wyczyść</button>
          <input 
            type="color" 
            [value]="strokeStyle" 
            (change)="changeColor($event)"
            title="Wybierz kolor">
          <input 
            type="range" 
            min="1" 
            max="20" 
            [(ngModel)]="lineWidth"
            title="Grubość linii">
          <button (click)="undoCurrentSlide()">Cofnij</button>
          <select [(ngModel)]="currentTool">
            <option value="freehand">Odręczne</option>
            <option value="line">Linia prosta</option>
            <option value="rectangle">Prostokąt</option>
            <option value="circle">Okrąg</option>
          </select>
        </div>

        <div class="slides-navigation">
          <button (click)="addSlide()" [disabled]="slides.length >= 20">
            Nowy slajd
          </button>
          <button (click)="removeCurrentSlide()" [disabled]="slides.length <= 1">
            Usuń slajd
          </button>
          <div class="slide-numbers">
            <button (click)="previousSlide()" [disabled]="currentSlideIndex === 0">
              ←
            </button>
            <span>{{currentSlideIndex + 1}} / {{slides.length}}</span>
            <button (click)="nextSlide()" [disabled]="currentSlideIndex === slides.length - 1">
              →
            </button>
          </div>
        </div>
      </div>

      <div class="thumbnails">
        <div
          *ngFor="let slide of slides; let i = index"
          class="thumbnail"
          [class.active]="currentSlideIndex === i"
          (click)="switchToSlide(i)"
        >
          Slajd {{i + 1}}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drawing-board {
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 15px;
      gap: 15px;
    }

    .slides-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .controls {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
      flex-wrap: wrap;
      gap: 10px;
    }

    .drawing-controls {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .slides-navigation {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }

    .slide-numbers {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .thumbnails {
      display: flex;
      gap: 10px;
      padding: 10px;
      overflow-x: auto;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .thumbnail {
      min-width: 120px;
      height: 67.5px;
      background: white;
      border: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .thumbnail.active {
      border-color: #000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      background: #007bff;
      color: white;
      cursor: pointer;
      transition: background 0.2s;
    }

    button:hover:not(:disabled) {
      background: #0056b3;
    }

    button:disabled {
      background: #cccccc;
      cursor: not-allowed;
    }

    input[type="color"] {
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    input[type="range"] {
      width: 150px;
      cursor: pointer;
    }

    select {
      padding: 6px 12px;
      border-radius: 4px;
      border: 1px solid #ddd;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .controls {
        flex-direction: column;
      }

      .drawing-controls,
      .slides-navigation {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class DrawingBoardComponent implements AfterViewInit {
  @ViewChildren(SlideComponent) slideComponents!: QueryList<SlideComponent>;

  slides: Slide[] = [];
  currentSlideIndex = 0;
  currentTool: ShapeTool = 'freehand';
  lineWidth = 2;
  strokeStyle = '#000000';

  constructor() {
    this.addSlide();
  }

  ngAfterViewInit() {
    this.slideComponents.forEach(slide => slide.onResize());
  }

  addSlide() {
    if (this.slides.length >= 20) return;

    const newSlide: Slide = {
      id: this.slides.length,
      actions: [],
      pastedImages: []
    };

    this.slides.push(newSlide);
    this.switchToSlide(this.slides.length - 1);
  }

  removeCurrentSlide() {
    if (this.slides.length <= 1) return;

    this.slides.splice(this.currentSlideIndex, 1);
    if (this.currentSlideIndex >= this.slides.length) {
      this.currentSlideIndex = this.slides.length - 1;
    }
  }

  switchToSlide(index: number) {
    if (index >= 0 && index < this.slides.length) {
      this.currentSlideIndex = index;
    }
  }

  nextSlide() {
    this.switchToSlide(this.currentSlideIndex + 1);
  }

  previousSlide() {
    this.switchToSlide(this.currentSlideIndex - 1);
  }

  clearCurrentSlide() {
    const currentSlide = this.getCurrentSlideComponent();
    if (currentSlide) {
      currentSlide.clear();
    }
  }

  undoCurrentSlide() {
    const currentSlide = this.getCurrentSlideComponent();
    if (currentSlide) {
      currentSlide.undo();
    }
  }

  changeColor(event: Event) {
    this.strokeStyle = (event.target as HTMLInputElement).value;
  }

  onSlideChanged(slide: Slide) {
    this.slides[this.currentSlideIndex] = slide;
  }

  private getCurrentSlideComponent(): SlideComponent | null {
    if (this.slideComponents) {
      return this.slideComponents.toArray()[this.currentSlideIndex] || null;
    }
    return null;
  }

  // Optional: Add keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      this.undoCurrentSlide();
    }
  }
}
