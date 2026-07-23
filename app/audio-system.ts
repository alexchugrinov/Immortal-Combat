export type MusicScene = "menu" | "fight";
export type SoundEffect = "ui" | "whoosh" | "punch" | "kick" | "block" | "power";

class ImmortalAudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private scheduler: number | null = null;
  private nextBeatAt = 0;
  private beat = 0;
  private scene: MusicScene = "menu";
  private enabled = true;

  private ensureContext() {
    if (this.context || typeof window === "undefined") return this.context;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return null;
    const context = new AudioContextConstructor();
    const master = context.createGain();
    const musicBus = context.createGain();
    const effectsBus = context.createGain();
    master.gain.value = this.enabled ? .56 : 0;
    musicBus.gain.value = .28;
    effectsBus.gain.value = .72;
    musicBus.connect(master);
    effectsBus.connect(master);
    master.connect(context.destination);
    this.context = context;
    this.master = master;
    this.musicBus = musicBus;
    this.effectsBus = effectsBus;
    return context;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!this.context || !this.master) return;
    if (enabled) this.nextBeatAt = this.context.currentTime + .05;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(enabled ? .56 : 0, this.context.currentTime, .025);
  }

  setScene(scene: MusicScene) {
    if (this.scene === scene) return;
    this.scene = scene;
    this.beat = 0;
    if (this.context) this.nextBeatAt = this.context.currentTime + .04;
  }

  async unlock() {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === "suspended") await context.resume();
    if (this.scheduler === null) {
      this.nextBeatAt = context.currentTime + .05;
      this.scheduler = window.setInterval(() => this.scheduleMusic(), 40);
    }
  }

  playSfx(effect: SoundEffect) {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context || !this.effectsBus) return;
    if (context.state === "suspended") void this.unlock();
    const now = context.currentTime;
    switch (effect) {
      case "ui":
        this.tone(620, now, .045, "triangle", .055, this.effectsBus, 880);
        break;
      case "whoosh":
        this.noise(now, .12, .07, 1250, "bandpass", this.effectsBus);
        this.tone(190, now, .1, "sine", .025, this.effectsBus, 90);
        break;
      case "punch":
        this.noise(now, .075, .18, 520, "lowpass", this.effectsBus);
        this.tone(105, now, .1, "square", .11, this.effectsBus, 42);
        break;
      case "kick":
        this.noise(now, .11, .22, 390, "lowpass", this.effectsBus);
        this.tone(82, now, .15, "sawtooth", .12, this.effectsBus, 31);
        break;
      case "block":
        this.noise(now, .08, .1, 2200, "highpass", this.effectsBus);
        this.tone(310, now, .09, "triangle", .08, this.effectsBus, 170);
        break;
      case "power":
        this.noise(now, .42, .13, 980, "bandpass", this.effectsBus);
        this.tone(145, now, .46, "sawtooth", .09, this.effectsBus, 52);
        this.tone(218, now + .025, .38, "triangle", .065, this.effectsBus, 760);
        break;
    }
  }

  private scheduleMusic() {
    const context = this.context;
    if (!context || context.state !== "running" || !this.musicBus || !this.enabled) return;
    const beatLength = this.scene === "fight" ? .145 : .25;
    if (this.nextBeatAt < context.currentTime - .5) this.nextBeatAt = context.currentTime + .03;
    while (this.nextBeatAt < context.currentTime + .14) {
      if (this.scene === "fight") this.scheduleFightBeat(this.nextBeatAt, this.beat);
      else this.scheduleMenuBeat(this.nextBeatAt, this.beat);
      this.nextBeatAt += beatLength;
      this.beat = (this.beat + 1) % 64;
    }
  }

  private scheduleMenuBeat(time: number, beat: number) {
    if (!this.musicBus) return;
    const chord = [110, 130.81, 164.81, 196];
    if (beat % 8 === 0) {
      const chordIndex = Math.floor(beat / 8) % chord.length;
      const root = chord[chordIndex];
      this.tone(root / 2, time, 1.75, "sine", .045, this.musicBus);
      this.tone(root, time, 1.6, "triangle", .018, this.musicBus);
      this.tone(root * 1.5, time, 1.45, "sine", .013, this.musicBus);
    }
    if (beat % 4 === 0) this.tone(chord[Math.floor(beat / 4) % chord.length] * 2, time, .26, "triangle", .025, this.musicBus, undefined, 8);
    if (beat % 8 === 6) this.noise(time, .11, .012, 3200, "highpass", this.musicBus);
  }

  private scheduleFightBeat(time: number, beat: number) {
    if (!this.musicBus) return;
    const bass = [55, 55, 65.41, 73.42, 55, 82.41, 73.42, 65.41];
    if (beat % 4 === 0) {
      this.tone(58, time, .16, "sine", .11, this.musicBus, 34);
      this.noise(time, .08, .035, 180, "lowpass", this.musicBus);
    }
    if (beat % 8 === 4) this.noise(time, .105, .045, 1700, "bandpass", this.musicBus);
    if (beat % 2 === 0) this.tone(bass[Math.floor(beat / 2) % bass.length], time, .22, "sawtooth", .027, this.musicBus, undefined, -6);
    const notes = [220, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94, 196];
    this.tone(notes[beat % notes.length], time, .085, "square", .009, this.musicBus, undefined, beat % 2 ? 7 : -7);
    if (beat % 2 === 1) this.noise(time, .025, .009, 5200, "highpass", this.musicBus);
  }

  private tone(
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    destination: AudioNode,
    endFrequency?: number,
    detune = 0,
  ) {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.value = detune;
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume), start + Math.min(.018, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .01);
  }

  private noise(start: number, duration: number, volume: number, frequency: number, filterType: BiquadFilterType, destination: AudioNode) {
    const context = this.context;
    if (!context) return;
    if (!this.noiseBuffer) {
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = filterType === "bandpass" ? 1.2 : .7;
    gain.gain.setValueAtTime(Math.max(.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter).connect(gain).connect(destination);
    source.start(start);
    source.stop(start + duration + .01);
  }
}

export const audioSystem = new ImmortalAudioSystem();
