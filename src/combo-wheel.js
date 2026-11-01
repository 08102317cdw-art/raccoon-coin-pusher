// Verified behavior: an unbroken scoring combo charges a wheel; it spins only
// after the chain ends, up to ×5. Timing and later thresholds are tuning values,
// NOT claimed to be the closed-source game's exact numbers.
export const COMBO_THRESHOLDS = Object.freeze([8,16,32,64,128]);
export class ComboWheel {
  constructor(){this.count=0;this.last=-Infinity;this.window=.9;}
  get level(){return COMBO_THRESHOLDS.filter(n=>this.count>=n).length;}
  score(now,weight=1){this.count+=Math.max(1,weight);this.last=now;}
  tick(now){if(!this.count||now-this.last<this.window)return 0;const level=this.level;this.count=0;this.last=-Infinity;return level;}
  reset(){this.count=0;this.last=-Infinity;}
}
