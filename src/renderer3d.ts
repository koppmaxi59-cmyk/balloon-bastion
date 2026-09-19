import * as THREE from 'three';
import { GameMap } from './data/maps';
import { Bloon } from './entities/bloon';
import { Projectile } from './entities/projectile';
import { Tower } from './entities/tower';
import { TOWER_DATA, TowerTypeId } from './data/tower-data';

const WORLD_SCALE = 0.055;
const GROUND_Y = -0.6;

type Color = THREE.ColorRepresentation;

export class Renderer3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  private world = new THREE.Group();
  private dynamic = new THREE.Group();
  private mapKey = '';
  private preview: THREE.Group | null = null;
  private lastMap: GameMap | null = null;
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraDistance = 40;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color('#72c7dd');
    this.scene.add(this.world, this.dynamic);
    this.updateCameraZoom();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private toWorld(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3((x - 450) * WORLD_SCALE, 0, (y - 300) * WORLD_SCALE);
  }

  screenToMap(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const normalized = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(normalized, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return { x: 450, y: 300 };
    return { x: hit.x / WORLD_SCALE + 450, y: hit.z / WORLD_SCALE + 300 };
  }

  zoomCamera(amount: number) {
    this.cameraDistance = Math.max(24, Math.min(58, this.cameraDistance + amount));
    this.updateCameraZoom();
  }

  private updateCameraZoom() {
    this.camera.position.set(
      this.cameraTarget.x,
      this.cameraTarget.y + this.cameraDistance * 0.7,
      this.cameraTarget.z + this.cameraDistance * 0.72,
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private material(color: Color, roughness = 0.8) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length) {
      const child = group.children.pop();
      if (!child) continue;
      child.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
          else object.material.dispose();
        }
      });
    }
  }

  drawMap(map: GameMap) {
    this.clearGroup(this.dynamic);
    if (this.mapKey === map.name) return;
    this.mapKey = map.name;
    this.lastMap = map;
    this.clearGroup(this.world);
    this.scene.fog = new THREE.Fog('#72c7dd', 35, 75);

    const ambient = new THREE.HemisphereLight('#d9f4ff', '#386d45', 2.2);
    const sun = new THREE.DirectionalLight('#fff2c2', 3.2);
    sun.position.set(-18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    this.world.add(ambient, sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), this.material(map.bgColor));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    this.world.add(ground);

    const points = map.path.waypoints.map(point => {
      const world = this.toWorld(point.x, point.y);
      return new THREE.Vector3(world.x, 0, world.z);
    });
    const roadMaterial = this.material(map.pathColor);
    const borderMaterial = this.material('#896c4f');
    for (let index = 1; index < points.length; index++) {
      this.addRoadSegment(points[index - 1], points[index], map.pathWidth * WORLD_SCALE + 0.45, borderMaterial, 0.12);
      this.addRoadSegment(points[index - 1], points[index], map.pathWidth * WORLD_SCALE, roadMaterial, 0.18);
    }
    this.addFieldMarkers();
  }

  private addRoadSegment(start: THREE.Vector3, end: THREE.Vector3, width: number, material: THREE.Material, height: number) {
    const length = start.distanceTo(end);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.position.y = GROUND_Y + height / 2 + 0.02;
    mesh.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
    mesh.receiveShadow = true;
    this.world.add(mesh);
  }

  private addFieldMarkers() {
    const markerMaterial = this.material('#d7c47e');
    const accentMaterial = this.material('#7ab6a0');
    for (let index = 0; index < 22; index++) {
      const marker = new THREE.Mesh(
        index % 2 === 0 ? new THREE.CylinderGeometry(0.08, 0.16, 0.18, 6) : new THREE.BoxGeometry(0.26, 0.12, 0.26),
        index % 2 === 0 ? accentMaterial : markerMaterial,
      );
      marker.position.set((index * 31 % 36) - 18, -0.45, (index * 17 % 25) - 12);
      marker.rotation.y = index * 0.7;
      marker.castShadow = true;
      this.world.add(marker);
    }
  }

  drawTower(tower: Tower) {
    const position = this.toWorld(tower.x, tower.y);
    const group = new THREE.Group();
    group.position.set(position.x, 0, position.z);
    group.rotation.y = -tower.angle;
    if (tower.selected) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(tower.range * WORLD_SCALE - 0.04, tower.range * WORLD_SCALE, 48), new THREE.MeshBasicMaterial({ color: '#f5ca62', transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      group.add(ring);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.25, 12), this.material('#344b57'));
    base.position.y = 0.1;
    base.castShadow = true;
    group.add(base);
    this.addTowerBody(group, tower.type, tower.config.color, tower.config.accentColor);
    this.dynamic.add(group);
  }

  private addTowerBody(group: THREE.Group, type: TowerTypeId, color: Color, accent: Color) {
    const bodyMaterial = this.material(color);
    const accentMaterial = this.material(accent, 0.5);
    const tech = ['sub', 'buccaneer', 'ace', 'heli', 'mortar', 'dartling', 'engineer', 'sentinel', 'cannon'].includes(type);
    const magic = ['wizard', 'ninja', 'alchemist', 'chemist'].includes(type);
    const body = new THREE.Mesh(tech ? new THREE.BoxGeometry(0.85, 0.9, 0.85) : magic ? new THREE.ConeGeometry(0.58, 1.25, 6) : new THREE.SphereGeometry(0.65, 12, 9), bodyMaterial);
    body.position.y = 0.72;
    body.castShadow = true;
    group.add(body);
    const ornament = new THREE.Mesh(magic ? new THREE.OctahedronGeometry(0.23) : new THREE.CylinderGeometry(0.18, 0.22, 0.85, 8), accentMaterial);
    ornament.position.set(0, 1.25, 0.12);
    ornament.rotation.x = magic ? 0 : Math.PI / 2;
    ornament.castShadow = true;
    group.add(ornament);
  }

  drawBloon(bloon: Bloon) {
    if (!bloon.alive) return;
    const position = this.toWorld(bloon.x, bloon.y);
    const material = this.material(bloon.config.color, 0.35);
    const geometry = bloon.isMOAB ? new THREE.SphereGeometry(bloon.radius * WORLD_SCALE * 1.25, 16, 10) : new THREE.SphereGeometry(bloon.radius * WORLD_SCALE, 14, 10);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, bloon.isMOAB ? 1.05 : 0.55, position.z);
    mesh.scale.set(bloon.isMOAB ? 1.8 : 1, bloon.isMOAB ? 0.75 : 1, 1);
    mesh.castShadow = true;
    this.dynamic.add(mesh);
  }

  drawProjectile(projectile: Projectile) {
    if (!projectile.alive) return;
    const position = this.toWorld(projectile.x, projectile.y);
    const color = projectile.damageType === 'explosive' ? '#f28c48' : projectile.damageType === 'energy' ? '#ffe36e' : '#f7f2d0';
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), this.material(color, 0.25));
    mesh.position.set(position.x, 0.8, position.z);
    mesh.castShadow = true;
    this.dynamic.add(mesh);
  }

  spawnPopParticles(x: number, y: number, color: string) { /* visual effects are handled by the 3D frame */ }
  spawnExplosion(x: number, y: number, radius: number) { /* visual effects are handled by the 3D frame */ }
  updateAndDrawParticles(dt: number) {
    this.renderer.render(this.scene, this.camera);
  }

  drawPlacementPreview(towerType: TowerTypeId, x: number, y: number, canPlace: boolean) {
    if (this.preview) this.dynamic.remove(this.preview);
    this.preview = new THREE.Group();
    const position = this.toWorld(x, y);
    this.preview.position.set(position.x, 0, position.z);
    const color = canPlace ? TOWER_DATA[towerType].color : '#c75a5a';
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.75, 10), this.material(color));
    mesh.position.y = 0.45;
    mesh.scale.setScalar(0.8);
    this.preview.add(mesh);
    this.dynamic.add(this.preview);
  }

  drawOverlay(text: string, subText: string, color: string) {
    const overlay = document.querySelector('.game-overlay') as HTMLElement | null;
    if (!overlay) return;
    overlay.innerHTML = `<strong style="color:${color}">${text}</strong><span>${subText}</span>`;
    overlay.classList.add('visible');
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
  }
}
