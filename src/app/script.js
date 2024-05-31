// ==UserScript==
// @name         Price check
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Find similar items on listing
// @author       Artem Nevmerzhytskyi
// @match        https://diablo.trade/*
// @updateURL    https://gist.github.com/TesterNA/ba45045f5efa3e48aee5ed5a2fe3cf14/raw/251ba7dc7e147839ef6a8a0c78842f29d177f8ad/d4PriceHelper.user.js
// @downloadURL  https://gist.github.com/TesterNA/ba45045f5efa3e48aee5ed5a2fe3cf14/raw/251ba7dc7e147839ef6a8a0c78842f29d177f8ad/d4PriceHelper.user.js
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  let searchBtnContainer;
  let link;
  let categories, classes, equipment, itemType, mode, power, rarity, uniqueItem;
  let implGroup = [], affGroup = [];

  const scriptUrl = "https://raw.githubusercontent.com/TesterNA/d4trade/main/data1.json";
  const baseUrl = 'https://diablo.trade/listings/items';
  let data;

  function findElements() {
    if(!data) return;
    const container = document.querySelector('main > div + div');
    if (!container) return;
    const dataBtns = container.querySelectorAll('div > span + button');
    const dataInputs = container.querySelectorAll('div > span + div > input');
    const groups = container.querySelectorAll('div.uppercase');
    const implicitGroupContainer = findDivWithText('Implicits', groups)?.nextElementSibling;
    const implicitGroup = implicitGroupContainer?.querySelectorAll(':scope > div');
    const affixesGroupContainer = findDivWithText('Affixes', groups)?.nextElementSibling;
    const affixesGroup = affixesGroupContainer?.querySelectorAll(':scope > div');
    const btns = container.querySelectorAll('div > button');
    const submitBtn = findDivWithText('Submit', btns);

    Array.from(dataBtns).forEach((element) => {
      fillData(element.previousElementSibling.innerText.toLowerCase(), element.innerText.toLowerCase());
    })
    Array.from(dataInputs).forEach((element) => {
      fillData(element.parentElement.previousElementSibling.innerText.toLowerCase(), element.innerText);
    })
    if (implicitGroup) {
      Array.from(implicitGroup).forEach((element, i) => {
        const el = element.querySelector('button');
        implGroup[i] = searchKeyByValue(data, el.innerText);
      })
    }
    if (affixesGroup) {
      Array.from(affixesGroup).forEach((element, i) => {
        const el = element.querySelector('button');
        const checked = element.querySelector('.peer:checked');
        if (!el.innerText?.length) return;
        const id = searchKeyByValue(data, el.innerText);
        affGroup[i] = {
          key: id,
          greater: !!checked
        };
      })
    }

    if (!submitBtn.hasAttribute('disabled')) {
      buildUrl();
      return;
    } else if (submitBtn.hasAttribute('disabled') && searchBtnContainer) {
      document.querySelector('aside').removeChild(searchBtnContainer);
      searchBtnContainer = null;
    }
  }

  function fillData(filter, value) {
    if (filter !== 'class restriction' && value === 'none') return;
    switch (filter) {
      case 'gameplay mode':
        mode = value;
        break;
      case 'rarity':
        rarity = value;
        break;
      case 'category':
        categories = value;
        break;
      case 'class restriction':
        classes = value === 'none' ? 'non-class specific' : value;
        break;
      case 'equipment':
        equipment = value;
        break;
      case 'unique item':
        uniqueItem = transformString(value);
        break;
      case 'item power':
        const maxPwr = Number(value) >= 925;
        uniqueItem = maxPwr ? '925,1000' : `0,${value}`;
        break;
    }
  }

  function transformString(input) {
    let result = input.replace(/\s+/g, '-');

    result = result.replace(/[^a-zA-Z-]/g, '');

    return result;
  }

  function findDivWithText(text, list) {
    let matchingDiv;

    for (let div of list) {
      if (div.innerText.trim().toLowerCase() === text.toLowerCase()) {
        matchingDiv = div;
        break;
      }
    }

    return matchingDiv;
  }

  function loadJson(url) {
    return fetch(url)
      .then(response => response.json())
      .catch(err => {
        console.error(`Failed to load JSON: ${err}`);
        throw err;
      });
  }

  function searchKeyByValue(obj, value) {
    value = value.replace('...', '');
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key].hasOwnProperty('name') && obj[key]['name'].toLowerCase().includes(value.toLowerCase())) {
          return key;
        } else if (typeof obj[key] === 'object') {
          const result = searchKeyByValue(obj[key], value);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  }

  function buildUrl() {
    const group1 = implGroup.join('|') + ',implicits';
    const group2 = affGroup.map(item => `${item.key}${item.greater ? '@greater' : ''}`).join('|');


    const queryParams = {
      itemType: 'equipment',
      categories,
      classes,
      mode,
      power,
      rarity,
      group1,
      group2
    };
    if (queryParams.rarity !== 'unique') {
      queryParams.equipment = equipment;
    }
    if (queryParams.rarity === 'unique') {
      queryParams.uniqueItem = uniqueItem;
    }

    const url = constructUrl(baseUrl, queryParams);
    createSearchBtn(url);
  }

  function constructUrl(baseUrl, queryParams) {
    const url = new URL(baseUrl);

    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key) && !!queryParams[key]) {
        url.searchParams.append(key, queryParams[key]);
      }
    }

    return url.toString();
  }

  function createSearchBtn(url) {
    if (searchBtnContainer) {
      link.href = url;
      return;
    }
    const aside = document.querySelector('aside');
    searchBtnContainer = document.createElement('div');
    searchBtnContainer.classList.add('flex', 'bg-[#111212]', 'border-2', 'border-dim-yellow', 'p-4', 'gap-2', 'rounded-lg');
    link = document.createElement('a');
    const classes = [
      'flex', 'items-center', 'justify-center', 'rounded-md', 'lg:text-sm',
      'relative', 'space-x-4', 'z-10', 'complex-btn', 'complex-btn-red',
      'font-medium', 'whitespace-nowrap', 'bg-size-auto', 'text-red-200',
      'transition', 'after:absolute', 'active:translate-y-1', 'active:scale-95',
      'px-6', 'h-fit', 'w-fit', 'max-w-xs', 'uppercase', 'disabled:opacity-50',
      'gap-1', 'py-3', 'text-xs'
    ];
    link.classList.add(...classes);
    link.target = '_blank';
    link.href = url;
    link.textContent = 'Search for similar';

    searchBtnContainer.appendChild(link);
    aside.insertBefore(searchBtnContainer, aside.lastChild);
  }

  loadJson(scriptUrl).then(dataR => {
    data = dataR;
  }).catch(err => {
    console.error(`Failed to process JSON: ${err}`);
  });


  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length || mutation.removedNodes.length) {
        if(window.location.href === 'https://diablo.trade/create/equipment') findElements();
      }
    });
  });
  observer.observe(document.body, {subtree: true, childList: true});
})();
