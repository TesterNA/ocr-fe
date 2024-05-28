import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import Lens from './ocr/index.js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'] // fixed typo: styleUrl to styleUrls
})
export class AppComponent {
  title = 'free-ocr';

  imageSrc: string | ArrayBuffer | null = null;
  imageWidth: number | null = null;
  imageHeight: number | null = null;

  onPaste(event: ClipboardEvent): void {
    const lens = new Lens()
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    const item: DataTransferItem = clipboardData.items[0];

    console.log(item);

    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imageSrc = e.target!.result;

          const img = new Image();
          img.onload = async () => {
            this.imageWidth = img.width;
            this.imageHeight = img.height;
            await lens.scanByBuffer(file, [this.imageWidth, this.imageHeight]);
          };
          img.src = this.imageSrc as string;
        };
        reader.readAsDataURL(file);
      }
    }
  }
}
