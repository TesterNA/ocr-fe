import {inject, Injectable} from '@angular/core';
import {FuzzyMatchService} from "./fuzzy-match.service";
import {AFFIXES, Armors, Categories, Equipments, IMPLICITS, ImplicitsCount, Rarities, UNIQUES} from "../consts";
import {BehaviorSubject} from "rxjs";

export interface QueryParams {
  itemType: string;
  categories: string;
  power: string;
  rarity: string;
  group1: string;
  group2: string;
  equipment?: string;
  uniqueItem?: string;
}

export interface ParsedParams extends Partial<Omit<QueryParams, 'power' | 'group1' | 'group2'>> {
  power?: number;
  group1?: string[];
  group2?: { value: string, ga: boolean }[];
  error?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FillDataService {

  readonly baseUrl = 'https://diablo.trade/listings/items';

  readonly rarities = Rarities;
  readonly categories = Categories;
  readonly equipments = Equipments;
  readonly equipmentsTypeOfArmor = Armors;
  readonly uniques = UNIQUES;
  readonly implicitsCount = ImplicitsCount;
  readonly affixes = AFFIXES;
  readonly implicits = IMPLICITS;

  public parsedData = new BehaviorSubject<ParsedParams | null>(null);

  implicitCount = 0;
  affixCount = 0;
  isArmour = false;
  bound = false;

  link: string;
  category: string;
  classes: string;
  equipment: string;
  itemType: string;
  mode: string;
  power: number;
  rarity: string;
  uniqueItem: {key: string; name: string} | null;
  implGroup: any[] = []
  affGroup: any[] = [];

  private readonly fuzzyMatchService = inject(FuzzyMatchService);

  public fillData(data: { lines:string[]; words: string[] }): void {
    let armorSkipped = false;
    if (!data) {
      this.parsedData.next({ error: 'Text not recognized '});
      return;
    }
    this.bound = data.lines.some(line => line.toLowerCase().includes('bound') || line.toLowerCase().includes('account'));
    if (this.bound) {
      this.parsedData.next({ error: 'Bound items not supported'});
      return;
    }
    const pwrLvl = data.lines.find(line => line.toLowerCase().includes('item power'));
    if (this.bound) {
      this.parsedData.next({ error: 'Image not containing required information or text not recognized'});
      return;
    }

    this.itemType = 'equipment';
    // this.category = data.words.find(word => this.categories.includes(word.toLowerCase())) || '';
    // this.rarity = data.words.find(word => this.rarities.includes(word.toLowerCase())) || '';
    // this.equipment = data.words.find(word => this.equipments.includes(word.toLowerCase())) || '';

    this.category = this.fuzzyMatchService.findBestMatchGeneral(data.words, this.categories) || '';
    this.rarity = this.fuzzyMatchService.findBestMatchGeneral(data.words, this.rarities) || '';
    this.equipment = this.fuzzyMatchService.findBestMatchGeneral(data.words, this.equipments) || '';
    this.isArmour = this.equipmentsTypeOfArmor.includes(this.equipment);

    this.power = parseInt((pwrLvl || '').match(/\d+/)?.[0] || '0', 10);

    // this.implicitCount = data.lines.some(line => line.toLowerCase().includes('damage per second') || line.toLowerCase().includes('damage per hit') || line.toLowerCase().includes('attacks per second')) || this.equipment === 'amulet' ? 1 : this.equipment === 'ring' ? 2 : 0;
    // @ts-ignore
    this.implicitCount = this.implicitsCount[this.equipment] || 0;
    this.affixCount = this.rarity === 'rare' ? 2 : this.rarity === 'legendary' ? 3 : 4;

    if (this.rarity === 'unique') {
      const index = data.lines.findIndex(line => line.toLowerCase().includes(this.category.toLowerCase()) || line.toLowerCase().includes(this.rarity.toLowerCase()));
      const name = data.lines.slice(0, index).join(' ').trim().replace(/[^\w\s]/g, '');
      this.uniqueItem = this.searchUniqueByValue(this.uniques, name) || null;
    }

    const startFFWords = ['Attacks per Second', 'Armor', 'Damage per Hit', 'Damage Per Second', 'Item Power'];
    const startFFIndex = data.lines.findIndex(line =>
      startFFWords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))
    );

    const endFFWords = ['Empty', 'Socket', 'requires', 'level', 'sell'];
    const endFFIndex = data.lines.findIndex(line =>
      endFFWords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))
    );

    const affArr = data.lines.slice(startFFIndex + 1, endFFIndex);
    // console.log(affArr)
    const mods = affArr.map((a) => {
      const str = this.removeNonWordsAndSpaces(a);
      const aff = this.searchKeyByValueMaxRatio(this.affixes, str);
      const imp = this.searchKeyByValueMaxRatio(this.implicits, str);
      let skip = false

      const data = {
        org: str,
        affKey: aff?.key,
        affValue: aff?.name,
        affMax: aff?.similarity,
        implKey: imp?.key,
        implValue: imp?.name,
        implMax: imp?.similarity,
        greater: this.isGA(a),
      }

      if (aff?.key === '954bdb1353fa307' && this.isArmour && !armorSkipped) {
        armorSkipped = true;
        skip = true;
      } else if (aff?.key === 'ea2f9c0f4f3b6a1' && this.equipment !== 'shield') {
        skip = true;
      } else if (aff?.key === '13f69013668d65d' && this.equipment === 'shield') {
        skip = true;
      } else if (imp?.key && !aff?.key) {
        this.implGroup.push(data);
        skip = true;
      } else if (aff?.key && !imp?.key) {
        this.affGroup.push(data);
        skip = true;
      } else if (!aff?.key && !imp?.key) {
        skip = true;
      }

      return !skip ? data : null;
      // return data;
    }).filter(r => !!r);
    //
    // console.log(mods)
    // console.log(this.affGroup);
    // console.log(this.implGroup);

    if (this.implicitCount > this.implGroup.length) {
      const count = this.implicitCount - this.implGroup.length;
      const actualCount = Math.min(count, mods.length);
      this.implGroup = [...this.implGroup, ...mods.splice(0, actualCount)];
    }

    if (this.implicitCount < this.implGroup.length) {
      const count = this.implGroup.length - this.implicitCount;
      for (let i = 0; i < count; i++) {
        const el = this.implGroup.pop();
        mods.unshift(el);
      }
    }
    //
    //
    if (this.affixCount > this.affGroup.length) {
      const count = this.affixCount - this.affGroup.length;
      const actualCount = Math.min(count, mods.length);
      this.affGroup = [...this.affGroup, ...mods.splice(0, actualCount)]
    }

    if (this.affixCount < this.affGroup.length) {
      const count = this.affGroup.length - this.affixCount;
      for (let i = 0; i < count; i++) {
        const el = this.affGroup.pop();
        mods.unshift(el);
      }
    }


    this.buildUrl()
    // this.showData()
  }

  public reset(): void {
    this.implicitCount = 0;
    this.affixCount = 0;
    this.bound = false;
    this.link = '';
    this.category = '';
    this.classes = '';
    this.equipment = '';
    this.itemType = '';
    this.mode = '';
    this.power = 0;
    this.rarity = '';
    this.uniqueItem = null;
    this.implGroup = [];
    this.affGroup = [];
    this.isArmour = false;
  }

  private showData(): void {
    console.log(this.category)
    console.log(this.rarity)
    console.log(this.equipment)
    console.log(this.power)
    console.log(this.implicitCount)
    console.log(this.affixCount)
    console.log(this.uniqueItem)
    console.log(this.implGroup)
    console.log(this.affGroup)
  }

  private searchKeyByValue(obj: any, value: string): any {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key].hasOwnProperty('name') && this.fuzzyMatchService.compareStrings(value, obj[key]['name'], 90)) {
          return {key, name: obj[key]['name']};
        } else if (typeof obj[key] === 'object') {
          const result = this.searchKeyByValue(obj[key], value);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  }

  private searchKeyByValueMaxRatio(obj: any, value: string): any {
    let maxSimilarity = 85;
    let resultKey = null;
    let resultName = null;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const compareStr = this.removeNonWordsAndSpacesAtEnds(obj[key].toLowerCase());
        const similarity = this.fuzzyMatchService.compareStringsRatio(value.toLowerCase(), compareStr);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          resultKey = key;
          resultName = obj[key];
        }
      }
    }

    if (resultKey !== null) {
      return { key: resultKey, name: resultName, similarity: maxSimilarity };
    } else {
      return null;
    }
  }


  private searchUniqueByValue(obj: any, value: string): any {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (this.fuzzyMatchService.compareStrings(value, obj[key])) {
          return {key, name: obj[key]};
        } else if (typeof obj[key] === 'object') {
          const result = this.searchUniqueByValue(obj[key], value);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  }

  private removeNonWordsAndSpaces(str: string) {
    let withoutParentheses = str.replace(/\([^)]*/g, '');

    return withoutParentheses.replace(/[^\p{L}\s]/gu, '').trim();
  }

  private removeNonWordsAndSpacesAtEnds(str: string) {
    return str.replace(/^\W|\W$/g, '').trim();
  }

  private isGA(str: string) {
    return str.includes('*') || str.split(' ')[0].includes('#');
  }

  private buildUrl() {
    let group1 = null;
    let group2 = null;
    // if (this.implGroup.length) {
    group1 = this.implGroup.map(item => item.implKey).join('|') + ',implicits';
    // }
    // if (this.affGroup.length) {
    group2 = this.affGroup.map(item => `${item.affKey}${item.greater ? '@greater' : ''}`).join('|');
    // }
    const pwr = this.power >= 925 ? '925,1000' : `0,${this.power}`;

    const queryParams: QueryParams = {
      itemType: 'equipment',
      categories: this.category.toLowerCase(),
      power: pwr,
      rarity: this.rarity.toLowerCase(),
      group1,
      group2
    };
    if (queryParams.rarity.toLowerCase() !== 'unique') {
      queryParams.equipment = this.equipment.toLowerCase();
    }
    if (queryParams.rarity.toLowerCase() === 'unique') {
      queryParams.uniqueItem = this.uniqueItem?.key.toLowerCase();
    }

    // TODO: add mode and classes
    // mode,
    // classes,


    const url = this.constructUrl(this.baseUrl, queryParams);

    this.parsedData.next({
      ...queryParams,
      power: this.power,
      group1: this.implGroup.map(item => item.implValue),
      group2: this.affGroup.map(item => ({value: item.affValue, ga: item.greater})),
      equipment: this.equipment.toLowerCase(),
      uniqueItem: this.uniqueItem?.name,
      url
    });
  }

  private constructUrl(baseUrl: string, queryParams: any) {
    const url = new URL(baseUrl);

    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key) && !!queryParams[key]) {
        url.searchParams.append(key, queryParams[key]);
      }
    }

    return url.toString();
  }

  private recurseAffix(obj: Record<string, any>, field: string): Record<string, any> {
    let newObj: Record<string, any> = {};
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        if (value.hasOwnProperty(field)) {
          Object.assign(newObj, value[field]);
        } else {
          Object.assign(newObj, this.recurseAffix(value, field));
        }
      }
    }
    return newObj;
  }
}
