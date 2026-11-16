// hud.js — everything the player reads: the top strip (wave, crystal, score, embers),
// health and magazine at the corners, centre banners, the kill feed, and the three
// full-screen states (title, upgrade draft, end). Pure DOM; main.js feeds it numbers.
const $ = (id) => document.getElementById(id);

const els = {
  hud: $('hud'), waveNum: $('wave-num'), crystalBar: $('crystal-bar'), waveBar: $('wave-bar'),
  score: $('score'), embers: $('embers'), hpBar: $('hp-bar'), hpText: $('hp-text'),
  ammo: $('ammo'), reloadHint: $('reload-hint'), feed: $('feed'), banner: $('banner'),
  bannerBig: $('banner-big'), bannerSub: $('banner-sub'), hitmarker: $('hitmarker'),
  vignette: $('vignette'), title: $('title-screen'), upgrade: $('upgrade-screen'),
  upgradeTitle: $('upgrade-title'), upgradeSub: $('upgrade-sub'), cards: $('cards'),
  end: $('end-screen'), endTitle: $('end-title'), endSub: $('end-sub'),
  finalScore: $('final-score'), finalKills: $('final-kills'), finalWave: $('final-wave'),
};

let bannerTimer = 0;
let hitTimer = 0;

export const hud = {
  showGame() { els.hud.classList.remove('hidden'); },
  hideScreens() { els.title.classList.add('hidden'); els.upgrade.classList.add('hidden'); els.end.classList.add('hidden'); },
  showTitle() { els.title.classList.remove('hidden'); },
  setWave(wave, total) { els.waveNum.textContent = `${wave} / ${total}`; },
  setCrystal(frac) { els.crystalBar.style.width = `${Math.max(0, frac * 100)}%`; },
  setWaveProgress(frac) { els.waveBar.style.width = `${Math.min(100, frac * 100)}%`; },
  setScore(score, embers) { els.score.textContent = score.toLocaleString('en-US'); els.embers.textContent = embers; },
  setHp(hp, maxHp) {
    els.hpBar.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
    els.hpText.textContent = `${Math.max(0, Math.ceil(hp))} HP`;
  },
  setAmmo(ammo, magSize, reloading) {
    els.ammo.innerHTML = `${ammo} <small>/ ${magSize}</small>`;
    els.reloadHint.textContent = reloading ? 'RELOADING…' : ammo === 0 ? 'PRESS R TO RELOAD' : '';
  },
  banner(big, sub = '', ms = 2200) {
    els.bannerBig.textContent = big;
    els.bannerSub.textContent = sub;
    els.banner.classList.remove('hidden');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => els.banner.classList.add('hidden'), ms);
  },
  hitmark(kill) {
    els.hitmarker.style.opacity = '1';
    els.hitmarker.style.setProperty('--x', '1');
    for (const bar of els.hitmarker.children) bar.style.background = kill ? '#ff5340' : '#ffc46b';
    clearTimeout(hitTimer);
    hitTimer = setTimeout(() => { els.hitmarker.style.opacity = '0'; }, kill ? 130 : 70);
  },
  flashDamage() {
    els.vignette.style.boxShadow = 'inset 0 0 140px rgba(255,40,20,.55)';
    setTimeout(() => { els.vignette.style.boxShadow = 'inset 0 0 140px rgba(255,40,20,0)'; }, 130);
  },
  feed(html) {
    const row = document.createElement('div');
    row.innerHTML = html;
    els.feed.prepend(row);
    while (els.feed.children.length > 5) els.feed.lastChild.remove();
    setTimeout(() => { row.style.opacity = '0.35'; }, 2600);
  },
  showUpgrades(wave, upgrades, embers, onPick) {
    els.upgradeTitle.textContent = `WAVE ${wave} CLEARED`;
    els.upgradeSub.textContent = `The plaza breathes. You hold ${embers} embers — choose one blessing for wave ${wave + 1}.`;
    els.cards.innerHTML = '';
    for (const u of upgrades) {
      const affordable = embers >= u.cost;
      const card = document.createElement('button');
      card.className = 'card';
      card.innerHTML = `<div class="glyph">${u.glyph}</div><div class="name">${u.name}</div><div class="desc">${u.desc}</div><div class="cost">${affordable ? `${u.cost} embers — press on` : `${u.cost} embers — not enough`}</div>`;
      card.style.opacity = affordable ? '1' : '0.45';
      card.addEventListener('click', () => { if (affordable) onPick(u); });
      els.cards.appendChild(card);
    }
    els.upgrade.classList.remove('hidden');
  },
  hideUpgrades() { els.upgrade.classList.add('hidden'); },
  showEnd(won, { score, kills, wave }) {
    els.endTitle.textContent = won ? 'DAWN BREAKS' : 'THE LIGHT GOES OUT';
    els.endTitle.style.color = won ? '' : '#ff8a70';
    els.endSub.textContent = won
      ? 'Ten waves held. The crystal still burns, and the plaza is yours.'
      : `The Hollow drink deep on wave ${wave}. The plaza will need a new keeper.`;
    els.finalScore.textContent = score.toLocaleString('en-US');
    els.finalKills.textContent = kills;
    els.finalWave.textContent = wave;
    els.end.classList.remove('hidden');
  },
};
