import {Component, ElementRef, HostListener, inject, ViewChild} from '@angular/core';
import {CommonModule} from "@angular/common";
import {HotToastService} from "@ngxpert/hot-toast";
import {PreprocessService} from "../services/preprocess.service";
import {TesseractService} from "../services/tesseract.service";
import {FillDataService, ParsedParams} from "../services/fill-data.service";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {data} from "autoprefixer";

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
];

@Component({
  selector: 'app-drop-file',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drop-file.component.html',
  styleUrl: './drop-file.component.scss'
})
export class DropFileComponent {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  allowedFileTypes = ALLOWED_FILE_TYPES;
  imageSrc!: string;
  result: { lines:string[]; words: string[] } | null;
  parsedData: ParsedParams | null;
  loading = false;

  #hotToastService = inject(HotToastService);
  #fillDataService = inject(FillDataService);
  private readonly preprocessor = inject(PreprocessService);
  private readonly tesseract = inject(TesseractService);

  @HostListener('document:paste', ['$event'])
  handlePaste(event: ClipboardEvent) {
    this.onPaste(event)
  }

  constructor() {
    this.#fillDataService.parsedData.asObservable().pipe(takeUntilDestroyed())
      .subscribe(data => {
        this.loading = false;
        if (data?.error) {
          this.showError(data?.error);
          return;
        }
        // console.log(data)
        this.parsedData = data
      })
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.items[0];

      if (this.allowedFileTypes.indexOf(file?.type) === -1) {
        this.#hotToastService.error('File type is not allowed.');
        this.handleRemovesFile();
        return;
      }
      this.ocrData(file);
    }
  }

  handleChange(event: any) {
    const file = event.target.files[0];

    if (this.allowedFileTypes.indexOf(file?.type) === -1) {
      this.#hotToastService.error('File type is not allowed.');
      this.handleRemovesFile();
      return;
    }


    this.ocrData(file, true);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  handleRemovesFile() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = null;
    }

    this.imageSrc = '';
  }

  onPaste(event: ClipboardEvent): void {
    this.result = null;
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    const item: DataTransferItem = clipboardData.items[0];

    this.ocrData(item);

  }

  ocrData(data: DataTransferItem | File, skipGetAsFile = false) {
    this.#fillDataService.reset()
    this.imageSrc = '';
    this.parsedData = null;
    if (data.type.indexOf('image') !== -1) {
      this.loading = true;
      const blob = !this.isFile(data) ? data.getAsFile() : data;
      const reader = new FileReader();

      reader.onload = (evt) => this.generateImg(evt as ProgressEvent<FileReader>);
      reader.readAsDataURL(blob as Blob);
    } else {
      this.handleRemovesFile();
    }
  }

  openLink() {
    if (!this.parsedData?.url) return;
    window.open(this.parsedData?.url, '_blank');
  }

  private async onloadFn(img: HTMLImageElement) {
    const preprocessedImage = this.preprocessor.preprocessImage(img);
    if (!preprocessedImage) return;
    const preprocessedImgElement = new Image();
    preprocessedImgElement.src = preprocessedImage;
    this.result = await this.tesseract.recognizeImage(preprocessedImage);
    // console.log(this.result)
    this.#fillDataService.fillData(this.result);

  }

  private generateImg(event: ProgressEvent<FileReader>) {
    const img = new Image();

    this.imageSrc = event.target!.result as string;
    img.src = event.target!.result as string;
    img.onload = this.onloadFn.bind(this, img);
  }

  private isFile(item: any): item is File {
    return item instanceof File;
}

  private showError(error: string) {
    this.#hotToastService.error(error);
    this.handleRemovesFile();
  }
}
