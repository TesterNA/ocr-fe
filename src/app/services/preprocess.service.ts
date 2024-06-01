import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PreprocessService {

  // SERVICE #1 after loading image

  // First function after loading image, make image grayscale and call other manipulations
  preprocessImage(img: HTMLImageElement): string | null {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    // Resize the image if its dimensions are greater than 1000px for speed up AND for some reason big image tesseract worst recognise
    // (there no ideal size some images better recognise with up to 600px, some up to 800, i set 700 max size)
    const maxSize = 700;
    let width = img.width;
    let height = img.height;

    if (width > maxSize || height > maxSize) {
      const scaleFactor = Math.min(maxSize / width, maxSize / height);
      width = width * scaleFactor;
      height = height * scaleFactor;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {

      // here i change RED text in items cards(like sorcerrer items on barbarian have some text in red)
      if (data[i] > 100 && data[i + 1] < 20 && data[i + 2] < 20) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }

      // here transform to grayscale for better contrast text
      const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = brightness;
    }
    ctx.putImageData(imageData, 0, 0);
    // call removing sometimes vertical lines in images
    this.removeVerticalLines(ctx, canvas);

    return this.cropEmptyAndShortSides(ctx, canvas);
  }

// removing sometimes vertical lines in images allow get better result in recognition (remov eweird symbols | { [ } ] etc on start and end of line)
  private removeVerticalLines(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    for (let x = 0; x < width; x++) {
      let columnIsLine = true;

      for (let y = 0; y < height; y++) {
        const index = (y * width + x) * 4;
        const brightness = data[index];

        if (brightness > 112) {
          columnIsLine = false;
          break;
        }
      }

      if (columnIsLine) {
        for (let y = 0; y < height; y++) {
          const index = (y * width + x) * 4;
          data[index] = data[index + 1] = data[index + 2] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // crop image if there was deleted some vertical lines
  private cropEmptyAndShortSides(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    let minX = width, maxX = 0;

    // Detecting the content area
    for (let x = 0; x < width; x++) {
      let columnHasContent = false;

      for (let y = 0; y < height; y++) {
        const index = (y * width + x) * 4;
        const brightness = data[index]; // since the image is in grayscale, r=g=b=brightness

        if (brightness < 112) { // check if the pixel is part of the content
          columnHasContent = true;
          break;
        }
      }

      if (columnHasContent) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }

    // Cropping short and empty zones
    const threshold = 40; // Minimum width of a zone to be considered content
    let startX = minX;
    let endX = maxX;

    // Find the start of the main content by skipping short zones on the left
    for (let x = minX; x < maxX; x++) {
      if (x - startX > threshold) break;

      let columnHasContent = false;
      for (let y = 0; y < height; y++) {
        const index = (y * width + x) * 4;
        const brightness = data[index]; // since the image is in grayscale, r=g=b=brightness

        if (brightness < 112) { // check if the pixel is part of the content
          columnHasContent = true;
          break;
        }
      }

      if (!columnHasContent) {
        startX = x + 1;
      }
    }

    // Find the end of the main content by skipping short zones on the right
    for (let x = maxX; x > minX; x--) {
      if (endX - x > threshold) break;

      let columnHasContent = false;
      for (let y = 0; y < height; y++) {
        const index = (y * width + x) * 4;
        const brightness = data[index]; // since the image is in grayscale, r=g=b=brightness

        if (brightness < 112) { // check if the pixel is part of the content
          columnHasContent = true;
          break;
        }
      }

      if (!columnHasContent) {
        endX = x - 1;
      }
    }

    const croppedWidth = endX - startX + 1;
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = height;

    croppedCtx!.filter = 'brightness(1.2) contrast(1.5)';
    croppedCtx!.drawImage(canvas, startX, 0, croppedWidth, height, 0, 0, croppedWidth, height);

    // Here you can uncomment for seen how image looks after delete vertical lines and then after getting additional contrast and cropping
    // document.body.appendChild(canvas);
    // document.body.appendChild(croppedCanvas);
    // console.log(croppedCanvas);
    // console.log(croppedWidth);

    return croppedCanvas.toDataURL();
  }
}
