export type ResizeCallback = (event: { width: Number, height: Number }) => void;

export class ResizeHelper {
  iOS: Boolean;
  enabled: Booolean;

  constructor(callback: ResizeCallback);

  resizeTick(): void;
  resize(): void;
  onWindowResize(): void;
  getWindowResolution(): { width: Number, height: Number };
}