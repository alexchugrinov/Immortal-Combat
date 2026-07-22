"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";
import type { Fighter, Stage } from "./ImmortalCombat";

type ArenaProps = {
  stage: Stage;
  fighters: [Fighter, Fighter];
  positions: [number, number];
  jumping: [boolean, boolean];
  blocking: [boolean, boolean];
  hitSide: 0 | 1 | null;
  action: { side: 0 | 1; kind: "strike" | "power"; stamp: number } | null;
};

export function ThreeArena(props: ArenaProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveProps = useRef(props);
  liveProps.current = props;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;

    const start = async () => {
      const THREE = await import("three");
      if (disposed) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(props.stage.sky);
      scene.fog = new THREE.FogExp2(new THREE.Color(props.stage.sky).multiplyScalar(.32), .026);

      const camera = new THREE.PerspectiveCamera(41, 1, .1, 100);
      camera.position.set(0, 4.8, 14.4);
      camera.lookAt(0, 2.25, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-label", "Three-dimensional combat arena");
      mount.appendChild(renderer.domElement);

      const hemi = new THREE.HemisphereLight(0x789aca, 0x180b09, 1.35);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffd6a5, 4.8);
      key.position.set(-6, 10, 7); key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -12; key.shadow.camera.right = 12;
      scene.add(key);
      const rim = new THREE.DirectionalLight(new THREE.Color(props.stage.accent), 5.5);
      rim.position.set(7, 5, -6); scene.add(rim);

      const floorMat = new THREE.MeshPhysicalMaterial({ color: 0x17151c, roughness: .28, metalness: .58, clearcoat: .7, clearcoatRoughness: .2 });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(22, .45, 9), floorMat);
      floor.position.set(0, -.28, 0); floor.receiveShadow = true; scene.add(floor);
      const ring = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.02, 80), new THREE.MeshBasicMaterial({ color: props.stage.accent, transparent: true, opacity: .55, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .005; scene.add(ring);
      const innerRing = new THREE.Mesh(new THREE.RingGeometry(2.9, 2.94, 80), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .12, side: THREE.DoubleSide }));
      innerRing.rotation.x = -Math.PI / 2; innerRing.position.y = .008; scene.add(innerRing);

      const grid = new THREE.GridHelper(22, 22, new THREE.Color(props.stage.accent), 0x2b2730);
      grid.position.y = .012; (grid.material as Three.Material).transparent = true; (grid.material as Three.Material).opacity = .27; scene.add(grid);

      const city = new THREE.Group();
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x090a10, roughness: .88, metalness: .18 });
      for (let i = 0; i < 26; i++) {
        const h = 2.2 + ((i * 19) % 55) / 10;
        const w = .65 + ((i * 7) % 10) / 15;
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.05), darkMat.clone());
        building.position.set(-12 + i * .96, h / 2 - .2, -7.2 - (i % 3) * .55);
        building.receiveShadow = true; city.add(building);
        for (let y = .7; y < h - .3; y += .7) {
          const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(w * .62, .035, .012), new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? props.stage.accent : 0xffc277, transparent: true, opacity: .32 }));
          windowStrip.position.set(building.position.x, y, building.position.z + .54); city.add(windowStrip);
        }
      }
      scene.add(city);

      const moon = new THREE.Mesh(new THREE.SphereGeometry(1.3, 40, 40), new THREE.MeshBasicMaterial({ color: props.stage.accent }));
      moon.position.set(7, 8, -11); scene.add(moon);
      const moonGlow = new THREE.PointLight(new THREE.Color(props.stage.accent), 38, 18); moonGlow.position.copy(moon.position); scene.add(moonGlow);

      const crowd = new THREE.Group();
      const crowdGeo = new THREE.CapsuleGeometry(.13, .55, 3, 7);
      for (let i = 0; i < 42; i++) {
        const person = new THREE.Group();
        const body = new THREE.Mesh(crowdGeo, new THREE.MeshStandardMaterial({ color: i % 5 === 0 ? props.stage.accent : 0x15141a, roughness: 1 }));
        person.add(body);
        person.position.set(-9.4 + (i % 21) * .93, .55 + (i % 3) * .07, -4.5 - Math.floor(i / 21) * .58);
        person.userData.phase = i * .47; crowd.add(person);
      }
      scene.add(crowd);

      const makeTree = (x: number) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.13, .23, 3.3, 8), new THREE.MeshStandardMaterial({ color: 0x291812, roughness: 1 }));
        trunk.position.y = 1.65; trunk.castShadow = true; tree.add(trunk);
        for (let i = 0; i < 5; i++) {
          const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.8 + (i % 2) * .25, 1), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x173b2e : 0x20523d, roughness: .92 }));
          crown.position.set(Math.sin(i * 2.1) * .6, 3.3 + Math.cos(i) * .45, Math.cos(i * 1.7) * .35); crown.castShadow = true; tree.add(crown);
        }
        tree.position.x = x; tree.position.z = -2.3; scene.add(tree); return tree;
      };
      const trees = [makeTree(-9.2), makeTree(9.2)];

      const skinTones = [0xc78363, 0xc58a70, 0xb97855, 0xe0b7a1, 0xb77755, 0xd2a688, 0xa86b52];
      const makeFighter = (fighter: Fighter, side: 0 | 1) => {
        const group = new THREE.Group();
        const color = new THREE.Color(fighter.color);
        const glow = new THREE.Color(fighter.glow);
        const cloth = new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .25 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: .48, metalness: .5 });
        const skin = new THREE.MeshStandardMaterial({ color: skinTones[fighter.portraitIndex] ?? 0xc78363, roughness: .7 });
        const metal = new THREE.MeshStandardMaterial({ color: glow, roughness: .22, metalness: .82 });
        const energy = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: .8 });

        const hips = new THREE.Mesh(new THREE.BoxGeometry(.78, .5, .52), dark); hips.position.y = 1.65; hips.castShadow = true; group.add(hips);
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.48, 1.05, 8, 16), cloth); torso.position.y = 2.63; torso.scale.set(1.12, 1, .72); torso.castShadow = true; group.add(torso);
        const chest = new THREE.Mesh(new THREE.BoxGeometry(.92, .16, .64), metal); chest.position.set(0, 2.7, .03); chest.rotation.z = side ? -.16 : .16; chest.castShadow = true; group.add(chest);

        const headPivot = new THREE.Group(); headPivot.position.y = 3.82; group.add(headPivot);
        const head = new THREE.Mesh(new THREE.SphereGeometry(.37, 24, 20), skin); head.scale.set(.86, 1.08, .9); head.castShadow = true; headPivot.add(head);
        const hairColor = fighter.id === "volt" ? 0xcfa649 : fighter.id === "kael" ? 0xdde7ed : fighter.id === "aeri" ? 0x447967 : 0x0b090d;
        for (let i = 0; i < 7; i++) {
          const hair = new THREE.Mesh(new THREE.ConeGeometry(.12, .45, 6), new THREE.MeshStandardMaterial({ color: hairColor, roughness: .8 }));
          hair.position.set(-.25 + i * .08, .34 + Math.sin(i) * .05, -.02); hair.rotation.z = -.35 + i * .1; headPivot.add(hair);
        }
        const eyeMat = new THREE.MeshBasicMaterial({ color: fighter.id === "kage" ? 0xb363ff : 0xf3f6ff });
        for (const ex of [-.14, .14]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(.042, 10, 8), eyeMat); eye.position.set(ex, .07, .34); eye.scale.y = .55; headPivot.add(eye);
        }
        const nose = new THREE.Mesh(new THREE.ConeGeometry(.045, .16, 8), skin); nose.position.set(0, -.03, .39); nose.rotation.x = Math.PI / 2; headPivot.add(nose);
        if (["kael", "sahra", "kage"].includes(fighter.id)) {
          const maskShape = fighter.id === "sahra" ? new THREE.BoxGeometry(.62, .25, .12) : new THREE.ConeGeometry(.34, .5, 5);
          const mask = new THREE.Mesh(maskShape, fighter.id === "sahra" ? metal : dark);
          mask.position.set(0, -.15, .36); if (fighter.id !== "sahra") mask.rotation.x = Math.PI / 2; headPivot.add(mask);
          if (fighter.id === "kage") {
            for (const x of [-.22, .22]) { const fang = new THREE.Mesh(new THREE.ConeGeometry(.055, .25, 6), metal); fang.position.set(x, -.27, .48); fang.rotation.z = x < 0 ? -.25 : .25; headPivot.add(fang); }
          }
        }
        if (fighter.id === "sahra") {
          const diadem = new THREE.Mesh(new THREE.TorusGeometry(.31, .035, 8, 24, Math.PI), metal); diadem.position.set(0, .28, .12); diadem.rotation.z = Math.PI; headPivot.add(diadem);
        }

        const armPivots: Three.Group[] = [];
        for (const armSide of [-1, 1]) {
          const pivot = new THREE.Group(); pivot.position.set(armSide * .62, 3.0, 0); group.add(pivot); armPivots.push(pivot);
          const upper = new THREE.Mesh(new THREE.CapsuleGeometry(.15, .65, 6, 10), cloth); upper.position.y = -.42; upper.rotation.z = armSide * -.11; upper.castShadow = true; pivot.add(upper);
          const fist = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 12), skin); fist.position.set(armSide * .07, -.92, .03); fist.castShadow = true; pivot.add(fist);
          const guard = new THREE.Mesh(new THREE.TorusGeometry(.2, .055, 8, 18), metal); guard.position.set(armSide * .07, -.72, .03); guard.rotation.x = Math.PI / 2; pivot.add(guard);
        }
        const legs: Three.Group[] = [];
        for (const legSide of [-1, 1]) {
          const pivot = new THREE.Group(); pivot.position.set(legSide * .27, 1.62, 0); group.add(pivot); legs.push(pivot);
          const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .9, 6, 10), dark); leg.position.y = -.57; leg.castShadow = true; pivot.add(leg);
          const boot = new THREE.Mesh(new THREE.BoxGeometry(.38, .25, .62), dark); boot.position.set(0, -1.18, .13); boot.castShadow = true; pivot.add(boot);
        }

        if (fighter.id === "raizen" || fighter.id === "volt") {
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.36, 16, 10), metal); shoulder.scale.set(1.3, .6, 1); shoulder.position.set(side ? .58 : -.58, 3.12, 0); shoulder.castShadow = true; group.add(shoulder);
        }
        if (fighter.id === "nyra" || fighter.id === "aeri") {
          for (let i = 0; i < 5; i++) { const feather = new THREE.Mesh(new THREE.ConeGeometry(.12, .85, 5), new THREE.MeshStandardMaterial({ color: fighter.id === "aeri" ? 0xdbeee5 : fighter.color, roughness: .7 })); feather.position.set(-.46 + i * .23, 2.95, -.32); feather.rotation.z = -.35 + i * .17; feather.rotation.x = -.35; group.add(feather); }
        }
        if (fighter.id === "kael") {
          const hood = new THREE.Mesh(new THREE.TorusGeometry(.43, .13, 10, 24, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: 0xe5eff3, roughness: .7 })); hood.position.set(0, 3.8, -.05); hood.rotation.z = -.65; group.add(hood);
        }
        if (fighter.id === "kage") {
          const collar = new THREE.Mesh(new THREE.ConeGeometry(.92, .85, 5, 1, true), dark); collar.position.y = 3.25; collar.rotation.y = Math.PI / 4; group.add(collar);
        }

        const orb = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), energy); orb.position.set(side ? -.82 : .82, 2.75, .2); group.add(orb);
        const orbLight = new THREE.PointLight(glow, 3, 2.2); orbLight.position.copy(orb.position); group.add(orbLight);
        group.scale.setScalar(1.06); group.rotation.y = side ? -Math.PI / 2.35 : Math.PI / 2.35;
        group.userData = { armPivots, legs, headPivot, orb, baseX: 0, phase: side * 1.7, lastAction: 0 };
        scene.add(group); return group;
      };
      const fighterGroups = [makeFighter(props.fighters[0], 0), makeFighter(props.fighters[1], 1)] as const;

      const particles: { mesh: Three.Mesh; velocity: Three.Vector3; life: number }[] = [];
      const spawnPower = (side: 0 | 1) => {
        const source = fighterGroups[side];
        const color = new THREE.Color(liveProps.current.fighters[side].glow);
        for (let i = 0; i < 22; i++) {
          const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.055 + Math.random() * .07, 0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
          mesh.position.set(source.position.x, 2.5 + Math.random() * 1.2, .2 + Math.random() * .5);
          scene.add(mesh); particles.push({ mesh, velocity: new THREE.Vector3((side === 0 ? 1 : -1) * (.13 + Math.random() * .12), (Math.random() - .5) * .08, (Math.random() - .5) * .08), life: 1 });
        }
      };

      let lastTime = performance.now();
      let lastActionStamp = 0;
      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        const now = performance.now();
        const dt = Math.min(.04, (now - lastTime) / 1000); lastTime = now;
        const time = clock.getElapsedTime();
        const current = liveProps.current;

        fighterGroups.forEach((group, index) => {
          const targetX = -8 + current.positions[index] / 100 * 16;
          group.position.x += (targetX - group.position.x) * Math.min(1, dt * 12);
          group.position.y = current.jumping[index] ? Math.sin(Math.min(1, ((now % 520) / 520)) * Math.PI) * 1.6 : 0;
          group.position.z = Math.sin(time * 1.2 + index) * .025;
          group.rotation.z = current.hitSide === index ? (index ? -.16 : .16) : Math.sin(time * 2 + index) * .008;
          const arms = group.userData.armPivots as Three.Group[];
          arms[0].rotation.z = current.blocking[index] ? -1.1 : -.17 + Math.sin(time * 2.4 + index) * .05;
          arms[1].rotation.z = current.blocking[index] ? 1.1 : .17 - Math.sin(time * 2.4 + index) * .05;
          (group.userData.legs as Three.Group[]).forEach((leg, li) => { leg.rotation.z = Math.sin(time * 2.2 + li * Math.PI + index) * .025; });
          (group.userData.orb as Three.Mesh).scale.setScalar(1 + Math.sin(time * 4 + index) * .24);
        });

        const action = current.action;
        if (action && action.stamp !== lastActionStamp) { lastActionStamp = action.stamp; fighterGroups[action.side].userData.lastAction = now; if (action.kind === "power") spawnPower(action.side); }
        fighterGroups.forEach((group, index) => {
          const elapsed = now - (group.userData.lastAction as number);
          if (elapsed < 320) {
            const punch = Math.sin((elapsed / 320) * Math.PI);
            const strikingArm = (group.userData.armPivots as Three.Group[])[index ? 0 : 1];
            strikingArm.rotation.x = -punch * 1.65; strikingArm.rotation.z += (index ? -1 : 1) * punch * .75;
            camera.position.x = Math.sin(time * 80) * punch * .035;
          } else camera.position.x += (0 - camera.position.x) * .2;
        });

        crowd.children.forEach((person) => { person.position.y = .55 + Math.max(0, Math.sin(time * 4.2 + person.userData.phase)) * .12; });
        trees.forEach((tree, i) => { tree.rotation.z = Math.sin(time * 1.15 + i) * .035; });
        city.position.x = Math.sin(time * .08) * .18;
        particles.forEach((particle) => { particle.mesh.position.add(particle.velocity); particle.life -= dt * 1.8; (particle.mesh.material as Three.MeshBasicMaterial).opacity = Math.max(0, particle.life); particle.mesh.scale.setScalar(1 + (1 - particle.life) * 2); });
        for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) { scene.remove(particles[i].mesh); particles[i].mesh.geometry.dispose(); (particles[i].mesh.material as Three.Material).dispose(); particles.splice(i, 1); }

        renderer.render(scene, camera);
      };

      const resize = () => { const { clientWidth, clientHeight } = mount; renderer.setSize(clientWidth, clientHeight, false); camera.aspect = clientWidth / Math.max(1, clientHeight); camera.updateProjectionMatrix(); };
      const observer = new ResizeObserver(resize); observer.observe(mount); resize(); animate();
      return () => { observer.disconnect(); cancelAnimationFrame(frame); renderer.dispose(); renderer.domElement.remove(); scene.traverse((object) => { const mesh = object as Three.Mesh; mesh.geometry?.dispose?.(); if (Array.isArray(mesh.material)) mesh.material.forEach((material: Three.Material) => material.dispose()); else mesh.material?.dispose?.(); }); };
    };

    let cleanup: (() => void) | undefined;
    start().then((dispose) => { cleanup = dispose; });
    return () => { disposed = true; cancelAnimationFrame(frame); cleanup?.(); };
  }, [props.stage.id, props.fighters[0].id, props.fighters[1].id]);

  return <div className="three-arena" ref={mountRef} aria-hidden="true" />;
}
