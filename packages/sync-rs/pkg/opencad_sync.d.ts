export default function init(): Promise<void>;
export class DocumentCrdt {
  constructor(peerId: string);
  applyLocal(elementId: string, valueJson: string): string;
  mergeRemote(deltaJson: string): void;
  stateJson(): string;
  vectorClock(): string;
  elementCount(): number;
}
