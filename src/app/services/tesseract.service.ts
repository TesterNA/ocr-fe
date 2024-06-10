import {Injectable} from '@angular/core';
import {ImageLike, Word, recognize} from "tesseract.js";

@Injectable({
  providedIn: 'root'
})
export class TesseractService {

  // SERVICE #2 after loading image

  // Tesseract provide confidence level for each line, word, paragraph, etc
  // for whole recognised text, sometimes its weird but in generally 40 looks good
  // (use it fore removing all WORDS with confidence lower (especially for some artifacts))
  // have different lvl for * and # symbols (in generally it recognised as great affix)
  private confidenceLvl = 40;
  private gaConfidenceLvl = 12;

  constructor() {
  }

  async recognizeImage(image: ImageLike): Promise<{ lines:string[]; words: string[] }> {
    // all recognised data from library
    const { data } = await recognize(image);
    if (localStorage.getItem('debug')) {
      console.log(data);
    }
    const lines = data.lines.map(line => line.words.filter(this.gaOptimizer).map(word => word.text).join(' '))
    const words = data.words.filter(this.gaOptimizer).map(word => word.text);
    return { lines, words };
  }

  // here i filter words for confidence lvl (also i leave correct words with confidence less that set above if that word is correct(tesseract has own dictionary for words))   : (word.confidence > this.confidenceLvl || word.in_dictionary);
  private gaOptimizer = (word: Word, i: number, arr: Word[]): boolean => {
    const isShortWithAsterisk = word.text.length < 3 && word.text.includes('*');
    const isFirstShortWithHash = !i && word.text.length < 2 && word.text.includes('#');
    const iseShortFirstLastWord = (!i || i === arr.length - 1) && word.text.length < 3;
    const isNotToWord = word.text.toLowerCase() !== 'to' && !i;

    if (isShortWithAsterisk || isFirstShortWithHash) {
      return word.confidence > this.gaConfidenceLvl;
    }

    if (iseShortFirstLastWord && (isNotToWord || true)) {
      return false;
    }

    return word.confidence > this.confidenceLvl || word.text.length > 3 && word.in_dictionary;
  };
}
