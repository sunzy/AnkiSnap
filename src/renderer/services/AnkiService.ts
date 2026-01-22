export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: {
    Front: string;
    Back: string;
  };
  audioPath?: string;
  tags?: string[];
}

export async function checkAnkiConnection(): Promise<boolean> {
  try {
    return await window.electronAPI.ankiCheckConnection();
  } catch (error) {
    return false;
  }
}

export async function addNoteToAnki(note: AnkiNote) {
  return await window.electronAPI.ankiAddNote(note);
}
