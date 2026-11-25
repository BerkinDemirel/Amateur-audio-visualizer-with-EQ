import { perspective, lookAt, multiply } from './math.js';

// Orbit camera: slepen = draaien, scrollen = zoomen, optioneel automatisch roteren
export class OrbitCamera {
  constructor(canvas) {
    this.yaw = 0.6; this.pitch = 0.35; this.dist = 3.5;
    this.target = [0, 0.6, 0];
    this.autoRotate = true; this.speed = 0.2;
    this.dragging = false;
    let last = null;
    canvas.addEventListener('pointerdown', e => { this.dragging = true; last = e; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!this.dragging) return;
      this.yaw -= (e.clientX - last.clientX) * 0.008;
      this.pitch = Math.min(1.4, Math.max(-0.2, this.pitch + (e.clientY - last.clientY) * 0.008));
      last = e;
    });
    const end = () => { this.dragging = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.dist = Math.min(10, Math.max(1.5, this.dist * Math.exp(e.deltaY * 0.001)));
    }, { passive: false });
  }

  update(dt) { if (this.autoRotate && !this.dragging) this.yaw += dt * this.speed; }

  eye() {
    const { yaw, pitch, dist, target: t } = this;
    return [t[0] + Math.cos(pitch) * Math.sin(yaw) * dist, t[1] + Math.sin(pitch) * dist, t[2] + Math.cos(pitch) * Math.cos(yaw) * dist];
  }

  viewProj(aspect) {
    return multiply(perspective(Math.PI / 4, aspect, 0.1, 100), lookAt(this.eye(), this.target, [0, 1, 0]));
  }
}
