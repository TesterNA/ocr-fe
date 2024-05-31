import { Injectable } from '@angular/core';
import * as fuzz from 'fuzzball';

@Injectable({
  providedIn: 'root'
})
export class FuzzyMatchService {

  constructor() { }

  findBestMatchingString(searchString: string, arrayOfStrings: string[], threshold: number = 70): string | null {
    const results = fuzz.extract(searchString, arrayOfStrings, { scorer: fuzz.partial_ratio });
    const bestMatch = results[0];

    if (bestMatch[1] >= threshold) {
      return bestMatch[0];
    }

    return null;
  }

  compareStrings(searchString: string, stringForCompare: string, threshold: number = 70): boolean {
    const results = fuzz.ratio(searchString, stringForCompare);

    return results >= threshold;
  }

  compareStringsRatio(searchString: string, stringForCompare: string): number {
    return fuzz.ratio(searchString, stringForCompare);
  }

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
