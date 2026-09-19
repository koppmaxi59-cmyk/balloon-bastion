import { DEFAULT_MAP, MAPS, GameMap } from './data/maps';
import { TOWER_DATA, TOWER_IDS, TowerTypeId } from './data/tower-data';
import { Bloon } from './entities/bloon';
import { Projectile } from './entities/projectile';
import { Tower } from './entities/tower';
import { Renderer3D } from './renderer3d';
import { processCollisions } from './systems/collision';
import { Economy } from './systems/economy';
import { DIFFICULTY_DATA, DifficultyId, WaveManager } from './systems/wave-manager';
import { dist } from './utils/math';

export function startGame(container: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.width = DEFAULT_MAP.width;
  canvas.height = DEFAULT_MAP.height;
  container.appendChild(canvas);

  const renderer = new Renderer3D(canvas);
  const economy = new Economy(650);
  const waves = new WaveManager('standard');
  const towers: Tower[] = [];
  const bloons: Bloon[] = [];
  const projectiles: Projectile[] = [];
  let activeMap: GameMap = DEFAULT_MAP;
  let selectedTowerType: TowerTypeId | null = null;
  let selectedTower: Tower | null = null;
  let mouse = { x: 0, y: 0 };
  let touchStart = { x: 0, y: 0 };
  let touchLast = { x: 0, y: 0 };
  let touchDragging = false;
  let ignoreNextClick = false;
  let lives = 100;
  let gameOver = false;
  let victory = false;
  let adminMode = false;

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = '<div class="brand"><span class="brand-mark">BT</span><div><strong>Balloon Bastion</strong><small>Classic mode</small></div></div><div class="stats"><span>💵 <b data-cash></b></span><span>❤️ <b data-lives></b></span><span>🏁 Runde <b data-round></b></span><button class="admin-open" type="button">Admin</button></div>';
  container.appendChild(hud);

  const controls = document.createElement('aside');
  controls.className = 'tower-bar';
  controls.innerHTML = '<button class="drawer-toggle" type="button" aria-label="Turmmenü einklappen" aria-expanded="true">‹</button><div class="panel-content"><div class="panel-title">Türme</div><div class="panel-note">Wähle einen Turm zum Platzieren<br>Mausrad oder ZOOM-Buttons: Ansicht vergrößern</div><div class="tower-list"></div></div>';
  container.appendChild(controls);

  const bottomDock = document.createElement('section');
  bottomDock.className = 'bottom-dock';
  bottomDock.innerHTML = '<div class="dock-top"><div><span class="dock-kicker">SPIELFELD</span><strong data-map-name></strong></div><div class="zoom-controls"><button class="zoom-out" type="button" aria-label="Herauszoomen">−</button><span>ZOOM</span><button class="zoom-in" type="button" aria-label="Hineinzoomen">+</button></div><select class="map-select" aria-label="Karte auswählen"></select><select class="difficulty-select" aria-label="Schwierigkeit"></select><button class="round-button" type="button">Runde starten</button></div><div class="upgrade-panel empty"></div>';
  container.appendChild(bottomDock);

  const overlay = document.createElement('div');
  overlay.className = 'game-overlay';
  container.appendChild(overlay);

  const adminPanel = document.createElement('div');
  adminPanel.className = 'admin-panel';
  adminPanel.innerHTML = '<div class="admin-card"><button class="admin-close" type="button" aria-label="Admin-Menü schließen">×</button><span class="admin-kicker">SYSTEMZUGRIFF</span><h2>Admin-Menü</h2><p>Code eingeben, um Testfunktionen freizuschalten.</p><input class="admin-code" type="password" placeholder="Zugangscode" autocomplete="off"><button class="admin-submit" type="button">Freischalten</button><small class="admin-feedback"></small></div>';
  container.appendChild(adminPanel);

  const drawerToggle = controls.querySelector('.drawer-toggle') as HTMLButtonElement;
  const towerList = controls.querySelector('.tower-list') as HTMLElement;
  const mapSelect = bottomDock.querySelector('.map-select') as HTMLSelectElement;
  const difficultySelect = bottomDock.querySelector('.difficulty-select') as HTMLSelectElement;
  const upgradePanel = bottomDock.querySelector('.upgrade-panel') as HTMLElement;
  const roundButton = bottomDock.querySelector('.round-button') as HTMLButtonElement;
  const mapNameLabel = bottomDock.querySelector('[data-map-name]') as HTMLElement;
  const zoomOut = bottomDock.querySelector('.zoom-out') as HTMLButtonElement;
  const zoomIn = bottomDock.querySelector('.zoom-in') as HTMLButtonElement;
  const adminOpen = hud.querySelector('.admin-open') as HTMLButtonElement;
  const adminClose = adminPanel.querySelector('.admin-close') as HTMLButtonElement;
  const adminCode = adminPanel.querySelector('.admin-code') as HTMLInputElement;
  const adminSubmit = adminPanel.querySelector('.admin-submit') as HTMLButtonElement;
  const adminFeedback = adminPanel.querySelector('.admin-feedback') as HTMLElement;

  zoomOut.addEventListener('click', () => renderer.zoomCamera(2));
  zoomIn.addEventListener('click', () => renderer.zoomCamera(-2));

  adminOpen.addEventListener('click', () => adminPanel.classList.add('visible'));
  adminClose.addEventListener('click', () => adminPanel.classList.remove('visible'));
  adminSubmit.addEventListener('click', () => {
    if (adminCode.value === '1234') {
      adminMode = true;
      economy.cash = 999999;
      lives = 999;
      adminFeedback.textContent = 'Admin-Modus aktiv: Geld, Leben und Türme sind frei.';
      adminFeedback.className = 'admin-feedback success';
      adminPanel.classList.add('unlocked');
      refreshControls();
    } else {
      adminFeedback.textContent = 'Code nicht erkannt.';
      adminFeedback.className = 'admin-feedback error';
    }
  });
  const cashLabel = hud.querySelector('[data-cash]') as HTMLElement;
  const livesLabel = hud.querySelector('[data-lives]') as HTMLElement;
  const roundLabel = hud.querySelector('[data-round]') as HTMLElement;

  difficultySelect.innerHTML = Object.entries(DIFFICULTY_DATA).map(([id, data]) => `<option value="${id}">${data.name}</option>`).join('');
  difficultySelect.value = 'standard';
  difficultySelect.addEventListener('change', () => {
    const difficulty = difficultySelect.value as DifficultyId;
    waves.setDifficulty(difficulty);
    economy.cash = DIFFICULTY_DATA[difficulty].startingCash;
    lives = DIFFICULTY_DATA[difficulty].startingLives;
    bloons.length = 0;
    projectiles.length = 0;
    towers.length = 0;
    selectedTower = null;
    selectedTowerType = null;
    gameOver = false;
    victory = false;
    refreshControls();
  });

  drawerToggle.addEventListener('click', () => {
    const collapsed = controls.classList.toggle('collapsed');
    drawerToggle.textContent = collapsed ? '›' : '‹';
    drawerToggle.setAttribute('aria-expanded', `${!collapsed}`);
    drawerToggle.setAttribute('aria-label', collapsed ? 'Menü ausklappen' : 'Menü einklappen');
  });

  mapSelect.innerHTML = MAPS.map((map, index) => `<option value="${index}">${map.name}</option>`).join('');
  mapSelect.addEventListener('change', () => {
    activeMap = MAPS[Number(mapSelect.value)];
    bloons.length = 0;
    projectiles.length = 0;
    towers.length = 0;
    selectedTower = null;
    selectedTowerType = null;
    waves.currentRound = 0;
    waves.roundActive = false;
    lives = 100;
    refreshControls();
  });

  for (const id of TOWER_IDS) {
    const cfg = TOWER_DATA[id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tower-card';
    button.dataset.tower = id;
    button.innerHTML = `<span class="tower-icon">${cfg.emoji}</span><span><strong>${cfg.name}</strong><small>${cfg.description}</small></span><b>$${cfg.cost}</b>`;
    button.addEventListener('click', () => {
      selectedTowerType = selectedTowerType === id ? null : id;
      selectedTower = null;
      if (selectedTowerType) {
        controls.classList.add('collapsed');
        drawerToggle.textContent = '›';
        drawerToggle.setAttribute('aria-expanded', 'false');
        drawerToggle.setAttribute('aria-label', 'Turmmenü ausklappen');
      }
      refreshControls();
    });
    towerList.appendChild(button);
  }

  roundButton.addEventListener('click', () => {
    if (!waves.roundActive && !gameOver && !victory) {
      waves.startRound();
      refreshControls();
    }
  });

  let last = performance.now();
  let animationFrameId: number;

  function worldToCanvas(e: MouseEvent) {
    const point = renderer.screenToMap(e.clientX, e.clientY);
    return {
      x: Math.max(8, Math.min(canvas.width - 8, point.x)),
      y: Math.max(8, Math.min(canvas.height - 8, point.y)),
    };
    /* Legacy logical mapping retained as a fallback reference for map data. */
    /*
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
    */
  }

  function distanceToPath(x: number, y: number): number {
    let nearest = Infinity;
    const points = activeMap.path.waypoints;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
      nearest = Math.min(nearest, dist({ x, y }, { x: a.x + t * dx, y: a.y + t * dy }));
    }
    return nearest;
  }

  function canPlace(type: TowerTypeId, x: number, y: number): boolean {
    if (x < 8 || x > canvas.width - 8 || y < 8 || y > canvas.height - 8) return false;
    if (distanceToPath(x, y) < activeMap.pathWidth / 2 + 8) return false;
    return towers.every(tower => dist(tower, { x, y }) > 34);
  }

  const handleClick = (e: MouseEvent) => {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    const point = worldToCanvas(e);
    if (selectedTowerType) {
      const cfg = TOWER_DATA[selectedTowerType];
      if ((adminMode || economy.canAfford(cfg.cost)) && canPlace(selectedTowerType, point.x, point.y)) {
        if (!adminMode) economy.spend(cfg.cost);
        towers.push(new Tower(selectedTowerType, point.x, point.y));
        selectedTowerType = null;
        refreshControls();
      }
      return;
    }

    selectedTower = towers.reduce<Tower | null>((found, tower) =>
      dist(tower, point) < 24 ? tower : found, null);
    for (const tower of towers) tower.selected = tower === selectedTower;
    refreshControls();
  };

  const handleMove = (e: MouseEvent) => { mouse = worldToCanvas(e); };
  const handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    touchStart = { x: e.clientX, y: e.clientY };
    touchLast = touchStart;
    touchDragging = false;
    canvas.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || !canvas.hasPointerCapture(e.pointerId)) return;
    const deltaX = e.clientX - touchLast.x;
    const deltaY = e.clientY - touchLast.y;
    if (!touchDragging && Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y) > 8) touchDragging = true;
    if (touchDragging) {
      renderer.panCamera(-deltaX * 0.025, -deltaY * 0.025);
      ignoreNextClick = true;
      e.preventDefault();
    }
    touchLast = { x: e.clientX, y: e.clientY };
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    renderer.zoomCamera(e.deltaY > 0 ? 2 : -2);
  };
  const handleKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
  const handleKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });

  function update(dt: number) {
    if (gameOver || victory) return;

    const spawnResult = waves.update(dt, bloons.filter(bloon => bloon.alive).length);
    bloons.push(...spawnResult.spawned);
    if (spawnResult.roundComplete) {
      economy.roundBonus(waves.currentRound);
      refreshControls();
    }

    for (const bloon of bloons) bloon.update(dt, activeMap.path);
    for (const tower of towers) projectiles.push(...tower.update(dt, bloons));
    for (const projectile of projectiles) projectile.update(dt);

    const collision = processCollisions(projectiles, bloons);
    economy.earn(collision.earnedCash);
    bloons.push(...collision.newBloons);
    for (const popped of collision.poppedBloons) renderer.spawnPopParticles(popped.x, popped.y, popped.config.color);
    const leakedCount = bloons.filter(bloon => bloon.leaked).length;
    lives -= leakedCount;
    bloons.splice(0, bloons.length, ...bloons.filter(bloon => !bloon.leaked && bloon.alive));
    projectiles.splice(0, projectiles.length, ...projectiles.filter(projectile => projectile.alive));

    if (lives <= 0) gameOver = true;
    if (waves.allRoundsComplete && !waves.roundActive && bloons.length === 0) victory = true;
    refreshHud();
  }

  function draw() {
    renderer.drawMap(activeMap);
    for (const tower of towers) renderer.drawTower(tower);
    for (const bloon of bloons) renderer.drawBloon(bloon);
    for (const projectile of projectiles) renderer.drawProjectile(projectile);
    renderer.updateAndDrawParticles(1 / 60);
    if (selectedTowerType) renderer.drawPlacementPreview(selectedTowerType, mouse.x, mouse.y, canPlace(selectedTowerType, mouse.x, mouse.y) && (adminMode || economy.canAfford(TOWER_DATA[selectedTowerType].cost)));
    if (gameOver) renderer.drawOverlay('Verteidigung verloren', 'Die Ballons haben den Ausgang erreicht.', '#ff7675');
    if (victory) renderer.drawOverlay('Runde 30 geschafft!', 'Dein Tal ist sicher.', '#ffe66d');
  }

  function refreshControls() {
    refreshHud();
    for (const button of towerList.querySelectorAll<HTMLButtonElement>('[data-tower]')) {
      const id = button.dataset.tower as TowerTypeId;
      button.classList.toggle('active', id === selectedTowerType);
      button.disabled = !adminMode && !economy.canAfford(TOWER_DATA[id].cost);
    }
    mapSelect.value = `${MAPS.indexOf(activeMap)}`;
    refreshUpgradePanel();
  }

  function refreshHud() {
    cashLabel.textContent = `$${economy.cash}`;
    livesLabel.textContent = `${Math.max(0, lives)}`;
    roundLabel.textContent = `${Math.min(waves.displayRound, waves.totalRounds)} / ${waves.totalRounds}`;
    roundButton.disabled = waves.roundActive || gameOver || victory;
    roundButton.textContent = waves.roundActive ? 'Runde läuft …' : waves.allRoundsComplete ? 'Alle Runden geschafft' : '▶  Runde starten';
    mapSelect.value = `${MAPS.indexOf(activeMap)}`;
    mapNameLabel.textContent = activeMap.name;
  }

  function refreshUpgradePanel() {
    if (!selectedTower) {
      upgradePanel.classList.add('empty');
      upgradePanel.innerHTML = '<div class="upgrade-empty">Turm auswählen<br><small>für Upgrades und Verkauf</small></div>';
      return;
    }

    upgradePanel.classList.remove('empty');
    const config = selectedTower.config;
    const pathMarkup = selectedTower.config.upgrades.map((path, pathIndex) => {
      const upgradePath = pathIndex as 0 | 1 | 2;
      const tier = selectedTower!.upgradeTiers[upgradePath];
      const next = selectedTower!.getNextUpgrade(upgradePath);
      const available = next && selectedTower!.canUpgrade(upgradePath);
      const tierDots = [0, 1, 2].map(index => `<i class="tier-dot ${index < tier ? 'filled' : ''}"></i>`).join('');
      return `<div class="upgrade-path"><div class="path-heading"><span>Pfad ${pathIndex + 1}</span><span>${tierDots}</span></div><button class="upgrade-button" data-path="${pathIndex}" ${available && economy.canAfford(next.cost) ? '' : 'disabled'}><span><strong>${next ? next.name : 'Pfad maximiert'}</strong><small>${next ? next.description : 'Keine weitere Verbesserung'}</small></span><b>${next ? `$${next.cost}` : 'MAX'}</b></button></div>`;
    }).join('');

    upgradePanel.innerHTML = `<div class="selected-heading"><span class="selected-icon">${config.emoji}</span><span><strong>${config.name}</strong><small>Stufe ${selectedTower.upgradeTiers.join('-')}</small></span></div><div class="upgrade-paths">${pathMarkup}</div><button class="sell-button" type="button">Verkaufen · $${selectedTower.sellValue}</button>`;
    for (const button of upgradePanel.querySelectorAll<HTMLButtonElement>('[data-path]')) {
      button.addEventListener('click', () => {
        const pathIndex = Number(button.dataset.path) as 0 | 1 | 2;
        const upgrade = selectedTower?.getNextUpgrade(pathIndex);
        if (selectedTower && upgrade && selectedTower.canUpgrade(pathIndex) && (adminMode || economy.spend(upgrade.cost))) {
          selectedTower.applyUpgrade(pathIndex);
          refreshControls();
        }
      });
    }
    upgradePanel.querySelector('.sell-button')?.addEventListener('click', () => {
      if (!selectedTower) return;
      economy.earn(selectedTower.sellValue);
      towers.splice(towers.indexOf(selectedTower), 1);
      selectedTower = null;
      refreshControls();
    });
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    update(dt);
    draw();

    animationFrameId = requestAnimationFrame(frame);
  }

  animationFrameId = requestAnimationFrame(frame);
  refreshControls();

  return function stopGame() {
    cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('mousemove', handleMove);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
    canvas.removeEventListener('wheel', handleWheel);
    canvas.remove();
    hud.remove();
    controls.remove();
    bottomDock.remove();
    overlay.remove();
    adminPanel.remove();
    renderer.dispose();
  };
}