// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer } from 'electron';

export type ViewChannel = 'view-message';
export type ResultChannel = 'result-message';

const electronHandler = {
  ipcRenderer: {
    review(viewChannel: ViewChannel, func: (json: any) => void) {
      ipcRenderer.on(viewChannel, (_event, json) => func(json));
    },
    resultView(resultView: ResultChannel, func: (json: any) => void) {
      ipcRenderer.on(resultView, (_event, json) => func(json));
    },
    // ─── 棋譜再生用 ───────────────────────────────
    getAppMode(): Promise<string> {
      return ipcRenderer.invoke('get-app-mode');
    },
    resolveLogsPath(): Promise<string | null> {
      return ipcRenderer.invoke('resolve-logs-path');
    },
    selectLogsFolder(): Promise<string> {
      return ipcRenderer.invoke('select-logs-folder');
    },
    getMatchList(logsPath: string): Promise<string[]> {
      return ipcRenderer.invoke('get-match-list', logsPath);
    },
    readLogFile(logsPath: string, fileName: string): Promise<unknown> {
      return ipcRenderer.invoke('read-log-file', logsPath, fileName);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
