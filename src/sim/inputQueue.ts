import { INPUT_BUFFER } from '../config';
import { type Dir, OPPOSITE } from './grid';

export class InputQueue {
  private queue: Dir[] = [];

  constructor(private readonly max = INPUT_BUFFER) {}

  push(dir: Dir, current: Dir) {
    const last = this.queue.at(-1) ?? current;
    if (dir === last || dir === OPPOSITE[last]) return;
    if (this.queue.length >= this.max) return;
    this.queue.push(dir);
  }

  next(current: Dir): Dir {
    return this.queue.shift() ?? current;
  }

  get size() {
    return this.queue.length;
  }
}
