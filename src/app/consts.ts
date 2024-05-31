import {default as data} from '../assets/data2.json';
import {default as affixes} from '../assets/affixes.json';
import {default as implicits} from '../assets/implicits.json';


// export const Rarities: string[] = ['Legendary', 'Rare', 'Unique'];
//
// export const Categories: string[] = ['Sacred', 'Ancestral'];
//
// export const Equipments: string[] = [
//   'Amulet', 'Boots', 'Chest Armor', 'Gloves', 'Helm', 'Pants', 'Ring',
//   'Axe', 'Bow', 'Crossbow', 'Dagger', 'Focus', 'Mace', 'Polearm', 'Scythe',
//   'Shield', 'Staff', 'Sword', 'Totem', 'Two-Handed Axe', 'Two-Handed Mace',
//   'Two-Handed Scythe', 'Two-Handed Sword', 'Wand'
// ];

export const Rarities: string[] = ['legendary', 'rare', 'unique'];

export const Categories: string[] = ['sacred', 'ancestral'];

export const Equipments: string[] = [
  'amulet', 'boots', 'chest armor', 'gloves', 'helm', 'pants', 'ring',
  'axe', 'bow', 'crossbow', 'dagger', 'focus', 'mace', 'polearm', 'scythe',
  'shield', 'staff', 'sword', 'totem', 'two-handed axe', 'two-handed mace',
  'two-handed scythe', 'two-handed sword', 'wand'
];

export const Armors: string[] = ['boots', 'chest armor', 'gloves', 'helm', 'pants', 'shield'];


export const UNIQUES: object = data;
export const AFFIXES: any = affixes;
export const IMPLICITS: object = implicits;

export const ImplicitsCount = {
  'ring': 2,
  'amulet': 1,
  'boots': 1,
  'focus': 1,
  'shield': 4,
  'axe': 1,
  'bow': 1,
  'crossbow': 1,
  'dagger': 1,
  'mace': 1,
  'polearm': 1,
  'scythe': 1,
  'staff': 1,
  'sword': 1,
  'totem': 1,
  'two-handed axe': 1,
  'two-handed mace': 1,
  'two-handed scythe': 1,
  'two-handed sword': 1,
  'wand': 1,
}
