import {Injectable, OnDestroy} from '@angular/core';
import {createWorker, ImageLike, Paragraph, recognize, Word, Worker} from "tesseract.js";

@Injectable({
  providedIn: 'root'
})
export class TesseractService implements OnDestroy {
  private worker: Worker | null = null;
  private confidenceLvl = 40;
  private gaConfidenceLvl = 12;

  constructor() {
    this.initializeWorker();
  }


  private async initializeWorker() {
    this.worker = await createWorker();
  }

  async recognizeImage(image: ImageLike): Promise<{ lines:string[]; words: string[] }> {
    if (!this.worker) {
      await this.initializeWorker();
    }

    const { data } = await this.worker!.recognize(image);
    console.log(data)
    const lines = data.lines.map(line => line.words.filter(this.gaOptimizer).map(word => word.text).join(' '))
    const words = data.words.filter(this.gaOptimizer).map(word => word.text);
    return { lines, words };
  }

  async ngOnDestroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  private gaOptimizer = (word: Word, i: number) => (word.text.length < 3 && word.text.includes('*')) ? word.confidence > this.gaConfidenceLvl : word.confidence > this.confidenceLvl;
}
