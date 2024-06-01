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

  // SERVICE #3 after loading image
  // here i make all comparing, parse data in format i want to display, etc
  // probably u have alot own logic for that and will change all in any way u want =)

  readonly baseUrl = 'https://diablo.trade/listings/items';

  // read data from consts, affixes, implicits(i make split files for it, but have old fn to get data from complicated objects like in your code(i think =) ))
  readonly rarities = Rarities;
  readonly categories = Categories;
  readonly equipments = Equipments;
  readonly equipmentsTypeOfArmor = Armors;
  readonly uniques = UNIQUES;
  readonly implicitsCount = ImplicitsCount;
  readonly affixes = AFFIXES;
  readonly implicits = IMPLICITS;

  // Observable stream for return data to main file and display in template
  public parsedData = new BehaviorSubject<ParsedParams | null>(null);

  // Necessary variables for affix, implicit count, bound item and armor item or not(cause for armor we have affix + armor and item have own armor)
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

  // main function for find, and set data from text to own variable
  public fillData(data: { lines:string[]; words: string[] }): void {
    // local variable for skip first armor option in text if item is armor
    let armorSkipped = false;

    // simple err, need make it more precise and complex i think
    if (!data) {
      this.parsedData.next({ error: 'Text not recognized '});
      return;
    }

    // item is bound
    this.bound = data.lines.some(line => line.toLowerCase().includes('bound') || line.toLowerCase().includes('account') || line.toLowerCase().includes('not tradable'));
    if (this.bound) {
      this.parsedData.next({ error: 'Bound items not supported'});
      return;
    }
    const pwrLvl = data.lines.find(line => line.toLowerCase().includes('item power'));

    // simple err, need make it more precise and complex i think
    if (!pwrLvl) {
      this.parsedData.next({ error: 'Image not containing required information or text not recognized'});
      return;
    }

    // just for link build
    this.itemType = 'equipment';

    // Use fuzzy lib for check category, rarity and type of item by comparing WORDS with constants
    this.category = this.fuzzyMatchService.findBestMatchGeneral(data.words, this.categories) || '';
    this.rarity = this.fuzzyMatchService.findBestMatchGeneral(data.words, this.rarities) || '';
    this.equipment = this.fuzzyMatchService.findBestMatchGeneral(data.words, this.equipments) || '';
    this.isArmour = this.equipmentsTypeOfArmor.includes(this.equipment);

    // simple power lvl (parse nomber from string with text about power lvl pwrLvl)
    this.power = parseInt((pwrLvl || '').match(/\d+/)?.[0] || '0', 10);

    // @ts-ignore
    this.implicitCount = this.implicitsCount[this.equipment] || 0;
    this.affixCount = this.rarity === 'rare' ? 2 : this.rarity === 'legendary' ? 3 : 4;

    // if item is uniq, use fuzzy service to compare name of item with list of uniques and get correct one (data2.json)
    if (this.rarity === 'unique') {
      const index = data.lines.findIndex(line => line.toLowerCase().includes(this.category.toLowerCase()) || line.toLowerCase().includes(this.rarity.toLowerCase()));
      const name = data.lines.slice(0, index).join(' ').trim().replace(/[^\w\s]/g, '');
      this.uniqueItem = this.searchUniqueByValue(this.uniques, name) || null;
    }

    // Just cutoff few lines and say next code when +-(not precise) starts lines with implicits and affixes
    const startFFWords = ['Attacks per Second', 'Armor', 'Damage per Hit', 'Damage Per Second', 'Item Power'];
    const startFFIndex = data.lines.findIndex(line =>
      startFFWords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))
    );

    // Just cutoff few lines and say next code when +-(not precise) ends lines with implicits and affixes
    const endFFWords = ['Empty', 'Socket', 'requires', 'level', 'sell'];
    const endFFIndex = data.lines.findIndex(line =>
      endFFWords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))
    );

    // Lines with implicits and affixes
    const affArr = data.lines.slice(startFFIndex + 1, endFFIndex);

    // MAIN LOGIC of getting correct affixes and implicits
    const mods = affArr.map((a) => {
      // remove from recognised lines all non words using regex (BE AWARE, IN THIS APP I DONT LOOK AT VALUE OF THIS AFFIXES, SO IF U need this, make some changes prob)
      const str = this.removeNonWords(a);

      // use simple loop with fuzzyservice found affixes similar to line
      const aff = this.searchKeyByValueMaxRatio(this.affixes, str);
      // use simple loop with fuzzyservice found implicits similar to line
      const imp = this.searchKeyByValueMaxRatio(this.implicits, str);

      // special flag to skip founded result by some condition
      let skip = false

      // object with all founded affixes
      // org - original line AFTER removing non-words
      // affKey - uniq key for affix, affValue - text of affix in DB, affMax - ratio of similarity of lines from fuzzy service
      // impl - all same as for affix but for implicit
      // greater - affix is greater =)
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
      // Just console it for debugging
      // console.log(data)

      // here conditions when we not leave founded/current item to result array of affixes/implicits
      // 1 - for skip first line of armor for armor-items
      // 2 and 3 - for some reason ON YOUR site 1 affix have diff ID for shields and non-shields
      // all other - if we found only implicit - i force push data as implicit, if only affix - force push to affix or skip if no found data
      if (aff?.key === '657a88e4b85e08a' && this.isArmour && !armorSkipped) {
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
    }).filter(r => !!r);

    // from general array of affixes/implicits add required numbers of implicits to implicit-array (if it still required cause some data we force push already above)
    if (this.implicitCount > this.implGroup.length) {
      const count = this.implicitCount - this.implGroup.length;
      const actualCount = Math.min(count, mods.length);
      this.implGroup = [...this.implGroup, ...mods.splice(0, actualCount)];
    }

    // not sure its required but leave it here for removing data if there already more than need
    if (this.implicitCount < this.implGroup.length) {
      const count = this.implGroup.length - this.implicitCount;
      for (let i = 0; i < count; i++) {
        const el = this.implGroup.pop();
        mods.unshift(el);
      }
    }

    // from general array of affixes/implicits add required numbers of affixes to affix-array (if it still required cause some data we force push already above)
    if (this.affixCount > this.affGroup.length) {
      const count = this.affixCount - this.affGroup.length;
      const actualCount = Math.min(count, mods.length);
      this.affGroup = [...this.affGroup, ...mods.splice(0, actualCount)]
    }

    // not sure its required but leave it here for removing data if there already more than need
    if (this.affixCount < this.affGroup.length) {
      const count = this.affGroup.length - this.affixCount;
      for (let i = 0; i < count; i++) {
        const el = this.affGroup.pop();
        mods.unshift(el);
      }
    }

    // call fn for build link and manually parse data for displaying
    this.buildUrl()
  }

  // just reset variables fn on new recognition data
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

  // simple loop fn with fuzzyservice found affixes similar to line AND RETURN MIN similar for 85% but return MAX similar, thats why here loop
  // required for situation like line "Non physical damage" have similarity to "Physical damage" more than 90%, but we really need "Non physical damage"
  private searchKeyByValueMaxRatio(obj: any, value: string): any {
    let maxSimilarity = 85;
    let resultKey = null;
    let resultName = null;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // remove non words + lowercase for string from db (in generally i make a lot comparings with lowercase cause in testings its show me better result)
        const compareStr = this.removeNonWordsAndSpacesAtEnds(obj[key].toLowerCase());
        // comparing using fuzzy service and in loop save max similar line
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

  // Function use fuzzy search for find max similar line to item name for found uniq item(data2.json)
  //  For real its can be simplify little bit, just leave it from old more complex method
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

  // remove non words from line AND WORDS AFTER SYMBOL (
  // use for affixes, required for removing from lines words like (barbarian only) cause its interferes to get correct most similar affix
  private removeNonWords(str: string) {
    let withoutParentheses = str.replace(/\([^)]*/g, '');

    return withoutParentheses.replace(/[^\p{L}\s]/gu, '').trim();
  }

  // very similar to fn above, remove but used for removing symbols # in db affixes list for better comparing
  // (without it some short affixes very bad recognise because of short text each symbol "take a lot threshold for himself" in comparing)
  private removeNonWordsAndSpacesAtEnds(str: string) {
    return str.replace(/^\W|\W$/g, '').trim();
  }

  // is great affix?
  private isGA(str: string) {
    return str.includes('*') || str.split(' ')[0].includes('#');
  }

  // build link and parse a little bit data to display in template
  private buildUrl() {
    let group1 = null;
    let group2 = null;

    // make implicit group for url from array of implicits
    group1 = this.implGroup.map(item => item.implKey).join('|') + ',implicits';

    // make affix group for url from array of affixes
    group2 = this.affGroup.map(item => `${item.affKey}${item.greater ? '@greater' : ''}`).join('|');

    // make your-site-way of power in URL
    const pwr = this.power >= 925 ? '925,1000' : `0,${this.power}`;

    // another params for url
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

    // there what i'm not add still, need add recognition of class probaly
    // TODO: add mode and classes
    // mode,
    // classes,

    // build url using params above
    const url = this.constructUrl(this.baseUrl, queryParams);


    // there how i parse data for displaying - use params from above and in little another way provide groups(cause we want show user text, not IDs)
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

  // simple url builder fn
  private constructUrl(baseUrl: string, queryParams: any) {
    const url = new URL(baseUrl);

    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key) && !!queryParams[key]) {
        url.searchParams.append(key, queryParams[key]);
      }
    }

    return url.toString();
  }
}
