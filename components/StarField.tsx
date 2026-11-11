import { SpaceCanvas } from "./SpaceCanvas";

/**
 * Koinot foni: aylanuvchi 360° panorama (Canvas) + pastda Yer ufqi va uchar yulduzlar (CSS).
 * "Sodda" mavzuda ko'rinmaydi.
 */
export function StarField() {
  return (
    <div className="space-bg" aria-hidden="true">
      <SpaceCanvas />
      <div className="shooting shooting-1" />
      <div className="shooting shooting-2" />
      <div className="earth" />
      <div className="space-vignette" />
    </div>
  );
}
