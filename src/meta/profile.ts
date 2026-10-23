import { loadSave, type SaveData, writeSave } from './save';

let data: SaveData | null = null;

export const profile = {
  get data(): SaveData {
    data ??= loadSave();
    return data;
  },
  save() {
    if (data) writeSave(data);
  },
};
