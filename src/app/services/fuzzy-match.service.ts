import { Injectable } from '@angular/core';
import * as fuzz from 'fuzzball';

@Injectable({
  providedIn: 'root'
})
export class FuzzyMatchService {

  constructor() { }

  // UTILITY-service

  // this service use fuzzyball lib - library for matching similar text, etc. wit a lot options,
  // I use all this strings for compare strings from tesseract recognition with DB data(in my case json) instead of comparing(===) or String.includes to get more correct data without artifacts

  // Function use for compare 2 string and return true if it similar at least for some threshold, i use
  compareStrings(searchString: string, stringForCompare: string, threshold: number = 70): boolean {
    const results = fuzz.ratio(searchString, stringForCompare);

    return results >= threshold;
  }

  // this fn almost same as above, but return just ratio of similarity for some other case
  compareStringsRatio(searchString: string, stringForCompare: string): number {
    return fuzz.ratio(searchString, stringForCompare);
  }

  // comparing strings from 2 diff arrays of strings and return most similar value (90 threshold)
  findBestMatchGeneral(words: string[], choices: string[]): string | null {
    for (let word of words) {
      const result = fuzz.extract(word.toLowerCase(), choices, { scorer: fuzz.token_set_ratio, cutoff: 90 });
      if (result.length > 0 && result[0][1] >= 90) {
        return result[0][0];
      }
    }
    return null;
  }
}
