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
  blocking: [boolean, boolean];
  hitSide: 0 | 1 | null;
  action: { side: 0 | 1; kind: CombatMove; stamp: number; combo: number } | null;
};

type Rig = {
  root: Three.Group;
  torso: Three.Group;
  head: Three.Group;
  arms: Three.Group[];
  forearms: Three.Group[];
  legs: Three.Group[];
  knees: Three.Group[];
  cape?: Three.Mesh;
  energy: Three.Mesh;
  lastAction: number;
  actionKind: CombatMove;
  wasJumping: boolean;
  jumpStarted: number;
};

export function ThreeArena(props: ArenaProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveProps = useRef(props);
  useEffect(() => { liveProps.current = props; }, [props]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      const THREE = await import("three");
      if (disposed) return;

      const scene = new THREE.Scene();
      const sky = new THREE.Color(props.stage.sky);
      scene.background = sky.clone().multiplyScalar(.52);
      scene.fog = new THREE.Fog(sky.clone().multiplyScalar(.24), 14, 34);

      const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
      camera.position.set(0, 3.15, 12.2);
      camera.lookAt(0, 2.05, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-label", "Cinematic three-dimensional combat arena");
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0x91b4e2, 0x190c0b, 1.85));
      const key = new THREE.DirectionalLight(0xffd8bd, 4.6);
      key.position.set(-5, 10, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = -11; key.shadow.camera.right = 11; key.shadow.camera.top = 8; key.shadow.camera.bottom = -2;
      scene.add(key);
      const rim = new THREE.DirectionalLight(new THREE.Color(props.stage.accent), 6.5);
      rim.position.set(6, 5, -5); scene.add(rim);
      const front = new THREE.DirectionalLight(0x9db8e6, 1.35);
      front.position.set(0, 3, 10); scene.add(front);

      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(22, .42, 8),
        new THREE.MeshPhysicalMaterial({ color: 0x111116, roughness: .24, metalness: .66, clearcoat: .75, clearcoatRoughness: .2 }),
      );
      floor.position.y = -.28; floor.receiveShadow = true; scene.add(floor);
      const grid = new THREE.GridHelper(22, 28, new THREE.Color(props.stage.accent), 0x3a343d);
      grid.position.y = -.055; (grid.material as Three.Material).transparent = true; (grid.material as Three.Material).opacity = .28; scene.add(grid);
      for (const radius of [3.2, 5.1]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + .045, 96), new THREE.MeshBasicMaterial({ color: props.stage.accent, transparent: true, opacity: radius < 4 ? .18 : .5, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = -.04; scene.add(ring);
      }

      const skyline = new THREE.Group();
      const buildingMat = new THREE.MeshStandardMaterial({ color: 0x090a10, roughness: .78, metalness: .28 });
      for (let i = 0; i < 30; i++) {
        const h = 2.3 + ((i * 23) % 61) / 10;
        const w = .54 + ((i * 11) % 9) / 13;
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), buildingMat);
        building.position.set(-13 + i * .9, h / 2 - .1, -8.2 - (i % 4) * .55); skyline.add(building);
        for (let y = .6; y < h - .3; y += .58) {
          if ((i + Math.round(y * 10)) % 3 === 0) continue;
          const windows = new THREE.Mesh(new THREE.BoxGeometry(w * .62, .025, .012), new THREE.MeshBasicMaterial({ color: i % 5 === 0 ? props.stage.accent : 0xffbd73, transparent: true, opacity: .42 }));
          windows.position.set(building.position.x, y, building.position.z + .51); skyline.add(windows);
        }
      }
      scene.add(skyline);

      const moon = new THREE.Mesh(new THREE.SphereGeometry(1.45, 40, 32), new THREE.MeshBasicMaterial({ color: props.stage.accent }));
      moon.position.set(7.3, 7.7, -12); scene.add(moon);
      const moonLight = new THREE.PointLight(new THREE.Color(props.stage.accent), 42, 22); moonLight.position.copy(moon.position); scene.add(moonLight);

      const crowd = new THREE.Group();
      for (let i = 0; i < 50; i++) {
        const person = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(.11, .46, 3, 6), new THREE.MeshStandardMaterial({ color: i % 7 === 0 ? props.stage.accent : 0x17151c, roughness: 1 }));
        const head = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 7), new THREE.MeshStandardMaterial({ color: 0x6d5146, roughness: 1 })); head.position.y = .4;
        person.add(body, head); person.position.set(-10 + (i % 25) * .82, .47 + (i % 4) * .05, -4.7 - Math.floor(i / 25) * .55); person.userData.phase = i * .61; crowd.add(person);
      }
      scene.add(crowd);

      const makeTree = (x: number, z: number) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12, .24, 3.5, 9), new THREE.MeshStandardMaterial({ color: 0x24140f, roughness: 1 }));
        trunk.position.y = 1.75; trunk.castShadow = true; tree.add(trunk);
        for (let i = 0; i < 7; i++) {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(.65 + (i % 3) * .16, 1), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x173d31 : 0x1e503c, roughness: .95 }));
          leaf.position.set(Math.sin(i * 2.2) * .72, 3.3 + Math.cos(i * 1.3) * .48, Math.cos(i) * .42); leaf.castShadow = true; tree.add(leaf);
        }
        tree.position.set(x, 0, z); scene.add(tree); return tree;
      };
      const trees = [makeTree(-9.8, -2.2), makeTree(9.7, -2.5)];

      const skinTones = [0xb96f50, 0xc88971, 0xb67c58, 0xd1a187, 0xa9684c, 0xc18e72, 0x945940];
      const makeFighter = (fighter: Fighter, side: 0 | 1): Rig => {
        const root = new THREE.Group();
        const color = new THREE.Color(fighter.color);
        const glow = new THREE.Color(fighter.glow);
        const cloth = new THREE.MeshPhysicalMaterial({ color, roughness: .43, metalness: .26, clearcoat: .18 });
        const clothDark = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(.2), roughness: .56, metalness: .32 });
        const black = new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: .48, metalness: .42 });
        const skin = new THREE.MeshStandardMaterial({ color: skinTones[fighter.portraitIndex] ?? 0xb96f50, roughness: .72 });
        const metal = new THREE.MeshPhysicalMaterial({ color: glow, roughness: .19, metalness: .85, clearcoat: .8 });
        const energyMat = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: .9 });
        const hairColor = fighter.id === "volt" ? 0xc7a56c : fighter.id === "kael" ? 0xd8e0e4 : fighter.id === "aeri" ? 0x315c51 : 0x100d12;
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: .84 });
        const add = (geometry: Three.BufferGeometry, material: Three.Material, parent: Three.Object3D, x: number, y: number, z: number) => {
          const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
        };

        const pelvis = add(new THREE.CylinderGeometry(.4, .47, .52, 10), black, root, 0, 1.35, 0); pelvis.scale.z = .72;
        const belt = add(new THREE.CylinderGeometry(.48, .48, .13, 12), metal, root, 0, 1.58, 0); belt.scale.z = .73;
        const torso = new THREE.Group(); torso.position.y = 1.65; root.add(torso);
        const chest = add(new THREE.CylinderGeometry(.55, .41, 1.35, 12), cloth, torso, 0, .56, 0); chest.scale.z = .64;
        const armor = add(new THREE.BoxGeometry(.94, .12, .48), metal, torso, 0, .7, .08); armor.rotation.z = side ? -.12 : .12;
        add(new THREE.BoxGeometry(.1, 1.03, .48), metal, torso, side ? -.13 : .13, .48, .11).rotation.z = side ? -.13 : .13;
        add(new THREE.CylinderGeometry(.18, .2, .25, 10), skin, root, 0, 3.05, 0);

        const head = new THREE.Group(); head.position.set(0, 3.43, 0); root.add(head);
        const skull = add(new THREE.CapsuleGeometry(.3, .22, 8, 18), skin, head, 0, 0, 0); skull.scale.set(.9, 1.04, .82);
        const jaw = add(new THREE.SphereGeometry(.28, 18, 14), skin, head, 0, -.18, .018); jaw.scale.set(.86, .72, .78);
        add(new THREE.ConeGeometry(.042, .14, 8), skin, head, 0, -.02, .287).rotation.x = Math.PI / 2;
        const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xe9ecf0 });
        const iris = new THREE.MeshBasicMaterial({ color: fighter.id === "kage" ? glow : new THREE.Color(0x24333d) });
        for (const ex of [-.115, .115]) {
          const eye = add(new THREE.SphereGeometry(.047, 12, 8), eyeWhite, head, ex, .055, .278); eye.scale.y = .54;
          add(new THREE.SphereGeometry(.021, 10, 8), iris, head, ex, .054, .32);
          const brow = add(new THREE.BoxGeometry(.12, .018, .02), hairMat, head, ex, .14, .292); brow.rotation.z = ex < 0 ? -.12 : .12;
        }
        add(new THREE.BoxGeometry(.16, .018, .018), new THREE.MeshBasicMaterial({ color: 0x4b201e }), head, 0, -.16, .292);
        for (let i = 0; i < 9; i++) {
          const spike = add(new THREE.ConeGeometry(.085 + (i % 2) * .025, .38 + (i % 3) * .06, 7), hairMat, head, -.27 + i * .068, .33 + Math.sin(i * 1.5) * .035, -.02);
          spike.rotation.z = -.45 + i * .11; spike.rotation.x = -.12;
        }
        if (fighter.id === "nyra" || fighter.id === "sahra" || fighter.id === "aeri") {
          for (let i = 0; i < 5; i++) { const braid = add(new THREE.CapsuleGeometry(.045, .54, 5, 7), hairMat, head, -.23 + i * .11, -.2 - (i % 2) * .12, -.15); braid.rotation.z = -.08 + i * .04; }
        }
        if (["kael", "sahra", "kage"].includes(fighter.id)) {
          const mask = add(new THREE.BoxGeometry(.52, .22, .09), fighter.id === "sahra" ? metal : black, head, 0, -.11, .286); mask.scale.x = .9;
          if (fighter.id === "kage") for (const ex of [-.16, .16]) { const fang = add(new THREE.ConeGeometry(.035, .17, 6), metal, head, ex, -.2, .35); fang.rotation.z = ex < 0 ? -.2 : .2; }
        }
        if (fighter.id === "kael") {
          const hood = add(new THREE.TorusGeometry(.34, .1, 9, 28, Math.PI * 1.55), new THREE.MeshStandardMaterial({ color: 0xcbd5d9, roughness: .8 }), head, 0, .02, -.03); hood.rotation.z = -.86;
        }

        const arms: Three.Group[] = [];
        const forearms: Three.Group[] = [];
        for (const armSide of [-1, 1]) {
          const shoulder = new THREE.Group(); shoulder.position.set(armSide * .57, 2.7, 0); root.add(shoulder); arms.push(shoulder);
          add(new THREE.SphereGeometry(.23, 14, 10), armSide === (side ? 1 : -1) && ["raizen", "volt", "kage"].includes(fighter.id) ? metal : cloth, shoulder, 0, 0, 0).scale.set(1.15, .82, 1);
          const upper = add(new THREE.CapsuleGeometry(.115, .5, 6, 10), clothDark, shoulder, 0, -.36, 0); upper.rotation.z = armSide * -.06;
          const elbow = new THREE.Group(); elbow.position.set(0, -.72, 0); shoulder.add(elbow); forearms.push(elbow);
          add(new THREE.CapsuleGeometry(.105, .46, 6, 10), skin, elbow, 0, -.3, .01);
          const bracer = add(new THREE.CylinderGeometry(.15, .12, .32, 9), metal, elbow, 0, -.33, .01); bracer.scale.z = .86;
          add(new THREE.SphereGeometry(.17, 12, 10), skin, elbow, 0, -.65, .04).scale.set(1.05, .82, 1.12);
        }

        const legs: Three.Group[] = [];
        const knees: Three.Group[] = [];
        for (const legSide of [-1, 1]) {
          const hip = new THREE.Group(); hip.position.set(legSide * .24, 1.35, 0); root.add(hip); legs.push(hip);
          add(new THREE.CapsuleGeometry(.16, .62, 6, 10), clothDark, hip, 0, -.42, 0);
          const knee = new THREE.Group(); knee.position.set(0, -.85, 0); hip.add(knee); knees.push(knee);
          add(new THREE.CapsuleGeometry(.145, .58, 6, 10), black, knee, 0, -.38, 0);
          const boot = add(new THREE.BoxGeometry(.31, .22, .57), black, knee, 0, -.78, .13); boot.rotation.x = -.06;
          add(new THREE.BoxGeometry(.28, .09, .48), metal, knee, 0, -.25, .06);
        }

        let cape: Three.Mesh | undefined;
        if (["raizen", "sahra", "kael", "kage"].includes(fighter.id)) {
          cape = add(new THREE.PlaneGeometry(1.16, 1.9, 4, 5), clothDark, root, 0, 2.12, -.34); cape.rotation.x = .08;
        } else {
          for (let i = 0; i < 5; i++) { const ribbon = add(new THREE.ConeGeometry(.09, .8, 5), cloth, root, -.42 + i * .21, 2.18, -.34); ribbon.rotation.z = -.28 + i * .14; ribbon.rotation.x = -.22; }
        }
        if (fighter.id === "sahra") { const veil = add(new THREE.PlaneGeometry(.76, .72), clothDark, head, 0, -.13, -.24); veil.rotation.x = .16; }
        if (fighter.id === "kage") { const collar = add(new THREE.ConeGeometry(.74, .72, 5, 1, true), black, root, 0, 2.82, -.08); collar.rotation.y = Math.PI / 4; }

        const energy = add(new THREE.SphereGeometry(.095, 14, 10), energyMat, root, side ? -.79 : .79, 2.42, .28);
        const energyLight = new THREE.PointLight(glow, 3.2, 2); energyLight.position.copy(energy.position); root.add(energyLight);
        root.scale.setScalar(1.16); root.rotation.y = side ? .28 : -.28; scene.add(root);
        return { root, torso, head, arms, forearms, legs, knees, cape, energy, lastAction: 0, actionKind: "jab", wasJumping: false, jumpStarted: 0 };
      };

      const rigs = [makeFighter(props.fighters[0], 0), makeFighter(props.fighters[1], 1)] as const;
      const particles: { mesh: Three.Mesh; velocity: Three.Vector3; life: number }[] = [];
      const spawnPower = (side: 0 | 1) => {
        const color = new THREE.Color(liveProps.current.fighters[side].glow);
        for (let i = 0; i < 32; i++) {
          const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.035 + Math.random() * .075, 0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
          mesh.position.set(rigs[side].root.position.x, 2.1 + Math.random() * 1.6, .2 + Math.random() * .45); scene.add(mesh);
          particles.push({ mesh, velocity: new THREE.Vector3((side ? -1 : 1) * (.14 + Math.random() * .12), (Math.random() - .5) * .07, (Math.random() - .5) * .06), life: 1 });
        }
      };

      let last = performance.now();
      let lastActionStamp = 0;
      let cameraKick = 0;
      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        const now = performance.now();
        const dt = Math.min(.04, (now - last) / 1000); last = now;
        const time = clock.getElapsedTime();
        const current = liveProps.current;
        const distance = Math.abs(current.positions[0] - current.positions[1]);

        rigs.forEach((rig, index) => {
          const targetX = -8 + current.positions[index] / 100 * 16;
          rig.root.position.x += (targetX - rig.root.position.x) * Math.min(1, dt * 15);
          if (current.jumping[index] && !rig.wasJumping) rig.jumpStarted = now;
          rig.wasJumping = current.jumping[index];
          rig.root.position.y = current.jumping[index] ? Math.sin(Math.min(1, (now - rig.jumpStarted) / 650) * Math.PI) * 1.6 : 0;
          const breath = Math.sin(time * 2.25 + index) * .025;
          rig.torso.position.y = 1.65 + breath;
          rig.head.rotation.z = Math.sin(time * 1.8 + index) * .015;
          rig.root.rotation.z = current.hitSide === index ? (index ? -.15 : .15) : 0;
          rig.root.position.z = current.hitSide === index ? -.08 : 0;
          rig.arms[0].rotation.z = current.blocking[index] ? -.82 : -.12 + breath;
          rig.arms[1].rotation.z = current.blocking[index] ? .82 : .12 - breath;
          rig.arms[0].rotation.x = current.blocking[index] ? -1.0 : 0;
          rig.arms[1].rotation.x = current.blocking[index] ? -1.0 : 0;
          rig.forearms.forEach((forearm, fi) => { forearm.rotation.z = current.blocking[index] ? (fi ? -.95 : .95) : 0; });
          rig.legs.forEach((leg, li) => { leg.rotation.z = Math.sin(time * 2.1 + li * Math.PI + index) * .025; });
          rig.energy.scale.setScalar(1 + Math.sin(time * 5 + index) * .28);
          if (rig.cape) { rig.cape.rotation.z = Math.sin(time * 1.7 + index) * .035; rig.cape.position.y = 2.12 + Math.sin(time * 2.2) * .025; }

          const elapsed = now - rig.lastAction;
          if (elapsed < 760) {
            const fast = Math.sin(Math.min(1, elapsed / (rig.actionKind === "power" ? 620 : rig.actionKind === "heavy" ? 430 : 280)) * Math.PI);
            const forward = index ? -1 : 1;
            if (rig.actionKind === "jab") {
              rig.arms[index ? 0 : 1].rotation.x = -fast * 1.65;
              rig.arms[index ? 0 : 1].rotation.z += forward * fast * .7;
              rig.torso.rotation.y = forward * fast * .18;
            } else if (rig.actionKind === "heavy") {
              rig.arms[index ? 1 : 0].rotation.z += forward * fast * 1.45;
              rig.arms[index ? 1 : 0].rotation.x = -fast * .85;
              rig.torso.rotation.y = -forward * fast * .38;
              rig.root.position.x += forward * fast * .11;
            } else if (rig.actionKind === "kick") {
              const leg = rig.legs[index ? 0 : 1]; leg.rotation.z = -forward * fast * 1.32; leg.rotation.x = -fast * .42;
              rig.knees[index ? 0 : 1].rotation.z = forward * fast * .4;
              rig.torso.rotation.z = -forward * fast * .12;
            } else {
              rig.arms[0].rotation.z = -1.25 * fast; rig.arms[1].rotation.z = 1.25 * fast;
              rig.torso.rotation.x = -fast * .16; rig.energy.scale.setScalar(1 + fast * 4.5);
            }
          } else { rig.torso.rotation.set(0, 0, 0); }
        });

        const nextAction = current.action;
        if (nextAction && nextAction.stamp !== lastActionStamp) {
          lastActionStamp = nextAction.stamp; rigs[nextAction.side].lastAction = now; rigs[nextAction.side].actionKind = nextAction.kind;
          cameraKick = nextAction.kind === "power" ? .16 : nextAction.kind === "heavy" ? .09 : .04;
          if (nextAction.kind === "power") spawnPower(nextAction.side);
        }

        crowd.children.forEach((person) => { person.position.y = .47 + Math.max(0, Math.sin(time * 4.1 + person.userData.phase)) * .14; });
        trees.forEach((tree, i) => { tree.rotation.z = Math.sin(time * 1.2 + i) * .038; });
        skyline.position.x = Math.sin(time * .09) * .16;
        particles.forEach((particle) => { particle.mesh.position.add(particle.velocity); particle.life -= dt * 1.6; (particle.mesh.material as Three.MeshBasicMaterial).opacity = Math.max(0, particle.life); particle.mesh.scale.setScalar(1 + (1 - particle.life) * 2.4); });
        for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) { scene.remove(particles[i].mesh); particles[i].mesh.geometry.dispose(); (particles[i].mesh.material as Three.Material).dispose(); particles.splice(i, 1); }

        const center = (rigs[0].root.position.x + rigs[1].root.position.x) / 2;
        const targetZ = 11.1 + Math.max(0, distance - 42) * .035;
        camera.position.x += (center * .18 - camera.position.x) * .055;
        camera.position.z += (targetZ - camera.position.z) * .045;
        cameraKick *= .84;
        camera.position.y = 3.15 + Math.sin(time * 92) * cameraKick;
        camera.lookAt(center * .1, 2.05, 0);
        renderer.render(scene, camera);
      };

      const resize = () => { const { clientWidth, clientHeight } = mount; renderer.setSize(clientWidth, clientHeight, false); camera.aspect = clientWidth / Math.max(1, clientHeight); camera.updateProjectionMatrix(); };
      const observer = new ResizeObserver(resize); observer.observe(mount); resize(); animate();
      return () => {
        observer.disconnect(); cancelAnimationFrame(frame); renderer.dispose(); renderer.domElement.remove();
        scene.traverse((object) => { const mesh = object as Three.Mesh; mesh.geometry?.dispose?.(); if (Array.isArray(mesh.material)) mesh.material.forEach((material: Three.Material) => material.dispose()); else mesh.material?.dispose?.(); });
      };
    };

    start().then((dispose) => { cleanup = dispose; });
    return () => { disposed = true; cancelAnimationFrame(frame); cleanup?.(); };
  // The WebGL scene is rebuilt only when its visual identity changes; live combat state flows through liveProps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.stage.id, props.fighters[0].id, props.fighters[1].id]);

  return <div className="three-arena" ref={mountRef} aria-hidden="true" />;
}
