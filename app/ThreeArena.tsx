/* Three.js intentionally manages mutable scene objects outside React's render cycle. */
/* eslint-disable react-hooks/immutability */
"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";
import type { Fighter, Stage } from "./ImmortalCombat";

type CombatMove = "jab" | "heavy" | "kick" | "power";
type ArenaProps = {
  stage: Stage;
  fighters: [Fighter, Fighter];
  positions: [number, number];
  jumping: [boolean, boolean];
  crouching: [boolean, boolean];
  blocking: [boolean, boolean];
  moving: [boolean, boolean];
  hitSide: 0 | 1 | null;
  action: { side: 0 | 1; kind: CombatMove; stamp: number; combo: number } | null;
};

type Rig = {
  root: Three.Group;
  mixer: Three.AnimationMixer;
  actions: Map<string, Three.AnimationAction>;
  current: string;
  lockedUntil: number;
  lastX: number;
  energy: Three.PointLight;
  wasJumping: boolean;
  jumpStarted: number;
  attackKind: CombatMove | null;
  attackStarted: number;
  attackDuration: number;
};

const femaleFighters = new Set(["nyra", "sahra"]);
const maskFighters = new Set(["kael", "sahra", "kage"]);

export function ThreeArena(props: ArenaProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveProps = useRef(props);
  useEffect(() => { liveProps.current = props; }, [props]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    let disposeScene: (() => void) | undefined;

    const start = async () => {
      const THREE = await import("three");
      const [{ GLTFLoader }, SkeletonUtils] = await Promise.all([
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/utils/SkeletonUtils.js"),
      ]);
      if (disposed) return;

      const scene = new THREE.Scene();
      const sky = new THREE.Color(props.stage.sky);
      scene.background = sky.clone().multiplyScalar(.22);
      scene.fog = new THREE.FogExp2(sky.clone().multiplyScalar(.12), .028);

      const camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
      camera.position.set(0, 3.25, 12.8);
      camera.lookAt(0, 2.1, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-label", "Three-dimensional combat arena with animated humanoid fighters");
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0x839cca, 0x12090d, 2.1));
      const key = new THREE.DirectionalLight(0xffd7ba, 5.8);
      key.position.set(-6, 10, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = -10; key.shadow.camera.right = 10; key.shadow.camera.top = 9; key.shadow.camera.bottom = -2;
      scene.add(key);
      const rim = new THREE.DirectionalLight(new THREE.Color(props.stage.accent), 7.5);
      rim.position.set(6, 5, -6); scene.add(rim);
      const faceLight = new THREE.DirectionalLight(0xd9e8ff, 2.7);
      faceLight.position.set(0, 4, 9); scene.add(faceLight);

      const floor = new THREE.Mesh(
        new THREE.CylinderGeometry(10.8, 11.2, .46, 72),
        new THREE.MeshPhysicalMaterial({ color: 0x0b0b11, roughness: .22, metalness: .7, clearcoat: .8 }),
      );
      floor.position.y = -.27; floor.receiveShadow = true; scene.add(floor);
      for (const radius of [3.6, 6.6, 9.4]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + .035, 128), new THREE.MeshBasicMaterial({ color: props.stage.accent, transparent: true, opacity: radius === 9.4 ? .52 : .18, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = -.035; scene.add(ring);
      }

      const skyline = new THREE.Group();
      const buildingMat = new THREE.MeshStandardMaterial({ color: 0x07080e, roughness: .8, metalness: .2 });
      for (let i = 0; i < 29; i++) {
        const h = 2.5 + ((i * 29) % 57) / 9;
        const w = .62 + ((i * 13) % 8) / 12;
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.2), buildingMat);
        building.position.set(-14 + i, h / 2, -9 - (i % 4) * .7); skyline.add(building);
        for (let y = .7; y < h - .4; y += .62) {
          if ((i + Math.round(y * 10)) % 3 === 0) continue;
          const window = new THREE.Mesh(new THREE.BoxGeometry(w * .55, .025, .012), new THREE.MeshBasicMaterial({ color: i % 6 === 0 ? props.stage.accent : 0xffc477, transparent: true, opacity: .46 }));
          window.position.set(building.position.x, y, building.position.z + .61); skyline.add(window);
        }
      }
      scene.add(skyline);

      const moon = new THREE.Mesh(new THREE.SphereGeometry(1.35, 40, 28), new THREE.MeshBasicMaterial({ color: props.stage.accent }));
      moon.position.set(7, 7.4, -12); scene.add(moon);
      const moonGlow = new THREE.PointLight(new THREE.Color(props.stage.accent), 38, 24); moonGlow.position.copy(moon.position); scene.add(moonGlow);

      const crowd = new THREE.Group();
      for (let i = 0; i < 48; i++) {
        const person = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .42, 3, 6), new THREE.MeshStandardMaterial({ color: i % 9 === 0 ? props.stage.accent : 0x17151e, roughness: 1 }));
        const head = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 7), new THREE.MeshStandardMaterial({ color: 0x76554a, roughness: 1 }));
        head.position.y = .38; person.add(body, head); person.position.set(-10 + (i % 24) * .86, .46, -4.5 - Math.floor(i / 24) * .55); person.userData.phase = i * .63; crowd.add(person);
      }
      scene.add(crowd);

      const makeTree = (x: number) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.11, .22, 3.1, 9), new THREE.MeshStandardMaterial({ color: 0x24150f, roughness: 1 }));
        trunk.position.y = 1.55; tree.add(trunk);
        for (let i = 0; i < 8; i++) {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(.58 + (i % 3) * .12, 1), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x16382d : 0x20523d, roughness: .95 }));
          leaf.position.set(Math.sin(i * 2.1) * .72, 3 + Math.cos(i * 1.3) * .44, Math.cos(i) * .38); tree.add(leaf);
        }
        tree.position.set(x, 0, -2.4); scene.add(tree); return tree;
      };
      const trees = [makeTree(-9.6), makeTree(9.6)];

      const loader = new GLTFLoader();
      const publicBase = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
      const base = `${publicBase}models/quaternius/`;
      const [male, female, animationLibrary] = await Promise.all([
        loader.loadAsync(`${base}Superhero_Male_FullBody.gltf`),
        loader.loadAsync(`${base}Superhero_Female_FullBody.gltf`),
        loader.loadAsync(`${base}UAL1_Standard.glb`),
      ]);
      if (disposed) return;

      const addEquipment = (model: Three.Group, fighter: Fighter, side: 0 | 1) => {
        const color = new THREE.Color(fighter.color);
        const armor = new THREE.MeshPhysicalMaterial({ color, metalness: .72, roughness: .24, clearcoat: .72, emissive: new THREE.Color(fighter.glow), emissiveIntensity: .08 });
        const dark = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(.17), metalness: .45, roughness: .42 });
        const spine = model.getObjectByName("spine_03");
        if (spine) {
          const collar = new THREE.Mesh(new THREE.TorusGeometry(.15, .018, 8, 30), armor); collar.rotation.x = Math.PI / 2; collar.position.set(0, .09, .015); spine.add(collar);
          const sash = new THREE.Mesh(new THREE.BoxGeometry(.045, .34, .022), armor); sash.position.set(side ? -.055 : .055, -.06, .105); sash.rotation.z = side ? -.38 : .38; spine.add(sash);
        }
        const pelvis = model.getObjectByName("pelvis");
        if (pelvis) { const belt = new THREE.Mesh(new THREE.TorusGeometry(.13, .026, 8, 30), dark); belt.rotation.x = Math.PI / 2; pelvis.add(belt); }
        const head = model.getObjectByName("Head");
        if (head && maskFighters.has(fighter.id)) {
          const mask = new THREE.Mesh(new THREE.BoxGeometry(.125, .072, .018, 4, 2, 1), dark);
          mask.position.set(0, .008, .093); mask.rotation.x = -.08; head.add(mask);
          for (const x of [-.036, .036]) { const slit = new THREE.Mesh(new THREE.BoxGeometry(.025, .008, .006), new THREE.MeshBasicMaterial({ color: fighter.glow })); slit.position.set(x, .018, .103); head.add(slit); }
        }
        if (fighter.id === "sahra" || fighter.id === "kage") {
          const head = model.getObjectByName("Head");
          if (head) { const veil = new THREE.Mesh(new THREE.CylinderGeometry(.118, .145, .13, 18, 1, true), dark); veil.position.y = -.04; head.add(veil); }
        }
      };

      const buildRig = (fighter: Fighter, side: 0 | 1): Rig => {
        const source = femaleFighters.has(fighter.id) ? female.scene : male.scene;
        const model = SkeletonUtils.clone(source) as Three.Group;
        model.traverse((object) => {
          const mesh = object as Three.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true; mesh.receiveShadow = true;
          if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((material) => material.clone());
          else mesh.material = mesh.material.clone();
        });
        addEquipment(model, fighter, side);
        const root = new THREE.Group(); root.add(model); scene.add(root);
        root.scale.setScalar(2.7);
        root.rotation.y = side === 0 ? .32 : -.32;
        const mixer = new THREE.AnimationMixer(model);
        const actions = new Map<string, Three.AnimationAction>();
        animationLibrary.animations.forEach((clip) => actions.set(clip.name, mixer.clipAction(clip)));
        const energy = new THREE.PointLight(new THREE.Color(fighter.glow), 2.4, 3.8); energy.position.set(0, 1.25, .5); root.add(energy);
        const rig = { root, mixer, actions, current: "", lockedUntil: 0, lastX: side ? 3 : -3, energy, wasJumping: false, jumpStarted: 0, attackKind: null, attackStarted: 0, attackDuration: 0 };
        play(rig, "Idle_Loop");
        return rig;
      };

      const play = (rig: Rig, name: string, once = false, desiredMs?: number) => {
        if (rig.current === name && !once) return;
        const next = rig.actions.get(name);
        if (!next) return;
        rig.actions.get(rig.current)?.fadeOut(.12);
        next.reset().fadeIn(.1).setEffectiveWeight(1);
        if (once) { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
        else { next.setLoop(THREE.LoopRepeat, Infinity); next.clampWhenFinished = false; }
        next.timeScale = desiredMs ? next.getClip().duration / (desiredMs / 1000) : 1;
        next.play(); rig.current = name;
      };

      const rigs: [Rig, Rig] = [buildRig(props.fighters[0], 0), buildRig(props.fighters[1], 1)];
      let lastActionStamp = 0;
      let lastHit: 0 | 1 | null = null;
      let cameraKick = 0;
      const clock = new THREE.Clock();

      const animate = () => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        const dt = Math.min(.04, clock.getDelta());
        const now = performance.now();
        const current = liveProps.current;

        rigs.forEach((rig, side) => {
          const x = (current.positions[side] - 50) * .145;
          rig.root.position.x += (x - rig.root.position.x) * .3;
          if (current.jumping[side] && !rig.wasJumping) rig.jumpStarted = now;
          rig.wasJumping = current.jumping[side];
          rig.root.position.y = current.jumping[side] ? Math.sin(Math.min(1, (now - rig.jumpStarted) / 650) * Math.PI) * 1.05 : 0;
          rig.energy.intensity = 2.1 + Math.sin(now * .008 + side) * .7;
          rig.mixer.update(dt);

          if (rig.attackKind === "kick" && now < rig.attackStarted + rig.attackDuration) {
            const force = Math.sin(Math.min(1, (now - rig.attackStarted) / rig.attackDuration) * Math.PI);
            const thigh = rig.root.getObjectByName(side === 0 ? "thigh_r" : "thigh_l");
            const calf = rig.root.getObjectByName(side === 0 ? "calf_r" : "calf_l");
            if (thigh) thigh.rotation.z += (side === 0 ? -1 : 1) * force * 1.18;
            if (calf) calf.rotation.z += (side === 0 ? 1 : -1) * force * .42;
          } else if (now >= rig.attackStarted + rig.attackDuration) rig.attackKind = null;

          if (now >= rig.lockedUntil) {
            if (current.jumping[side]) play(rig, "Jump_Loop");
            else if (current.blocking[side]) play(rig, "Sword_Idle");
            else if (current.crouching[side]) play(rig, current.moving[side] ? "Crouch_Fwd_Loop" : "Crouch_Idle_Loop");
            else if (current.moving[side] || Math.abs(x - rig.lastX) > .025) play(rig, "Walk_Loop");
            else play(rig, "Idle_Loop");
          }
          rig.lastX = x;
        });

        if (current.hitSide !== lastHit) {
          lastHit = current.hitSide;
          if (lastHit !== null) { const rig = rigs[lastHit]; play(rig, "Hit_Chest", true, 360); rig.lockedUntil = now + 330; cameraKick = .08; }
        }
        if (current.action && current.action.stamp !== lastActionStamp) {
          lastActionStamp = current.action.stamp;
          const rig = rigs[current.action.side];
          const config: Record<CombatMove, [string, number]> = {
            jab: ["Punch_Jab", 310], heavy: ["Punch_Cross", 590], kick: ["Sword_Attack", 520], power: ["Spell_Simple_Shoot", 960],
          };
          const [clip, duration] = config[current.action.kind];
          play(rig, clip, true, duration); rig.lockedUntil = now + duration;
          rig.attackKind = current.action.kind; rig.attackStarted = now; rig.attackDuration = duration;
          cameraKick = current.action.kind === "power" ? .15 : current.action.kind === "heavy" ? .09 : .045;
        }

        crowd.children.forEach((person) => { person.position.y = .46 + Math.max(0, Math.sin(now * .004 + person.userData.phase)) * .14; });
        trees.forEach((tree, i) => { tree.rotation.z = Math.sin(now * .0012 + i) * .038; });
        skyline.position.x = Math.sin(now * .00009) * .15;
        const center = (rigs[0].root.position.x + rigs[1].root.position.x) / 2;
        const distance = Math.abs(current.positions[0] - current.positions[1]);
        const targetZ = 11.4 + Math.max(0, distance - 38) * .038;
        camera.position.x += (center * .16 - camera.position.x) * .05;
        camera.position.z += (targetZ - camera.position.z) * .045;
        cameraKick *= .84; camera.position.y = 3.25 + Math.sin(now * .09) * cameraKick;
        camera.lookAt(center * .08, 2.18, 0);
        renderer.render(scene, camera);
      };

      const resize = () => { const { clientWidth, clientHeight } = mount; renderer.setSize(clientWidth, clientHeight, false); camera.aspect = clientWidth / Math.max(1, clientHeight); camera.updateProjectionMatrix(); };
      const observer = new ResizeObserver(resize); observer.observe(mount); resize(); animate();
      return () => {
        observer.disconnect(); cancelAnimationFrame(frame); rigs.forEach((rig) => rig.mixer.stopAllAction()); renderer.dispose(); renderer.domElement.remove();
        scene.traverse((object) => { const mesh = object as Three.Mesh; mesh.geometry?.dispose?.(); if (Array.isArray(mesh.material)) mesh.material.forEach((material: Three.Material) => material.dispose()); else mesh.material?.dispose?.(); });
      };
    };

    start().then((cleanup) => { disposeScene = cleanup; }).catch((error) => { console.error("Unable to load arena fighters", error); });
    return () => { disposed = true; cancelAnimationFrame(frame); disposeScene?.(); };
  // Scene assets only change when the arena or fighter identity changes; combat state is read from liveProps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.stage.id, props.fighters[0].id, props.fighters[1].id]);

  return <div className="three-arena" ref={mountRef} aria-hidden="true" />;
}
