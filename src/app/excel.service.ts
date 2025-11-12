import { Injectable } from '@angular/core';

export interface QuestionRecord {
  name: string;
  question: string;
  timestamp: Date;
}

export interface QuestionCategories {
  iceBreaking: Array<string>;
  gettingToKnow: Array<string>;
  deepConnection: Array<string>;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  private questionCategories: QuestionCategories = {
    iceBreaking: [],
    gettingToKnow: [],
    deepConnection: []
  };

  // 允許的名字清單
  private allowedNames: Array<string> = [];

  // Google Apps Script Web App URL (部署後取得)
  private readonly GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzI9mksv2aG38TbeGmUwx92L3ECCU2wudWvdwOQxwsuj2Iny0L95nVVBzxhpgjJ6jwI/exec';

  constructor() {
    this.loadQuestionsFromGoogleSheets();
    this.loadAllowedNamesFromGoogleSheets();
  }

  // 從 Google Sheets 載入題目分類
  async loadQuestionsFromGoogleSheets(): Promise<void> {
    const response = await fetch(`${this.GOOGLE_SCRIPT_URL}?action=getQuestions`);
    const data = await response.json();

    if (data.status === 'success' && data.questions) {
      this.questionCategories = data.questions;
    }
  }

  // 從 Google Sheets 載入允許的名字清單
  async loadAllowedNamesFromGoogleSheets(): Promise<void> {
    const response = await fetch(`${this.GOOGLE_SCRIPT_URL}?action=getAllowedNames`);
    const data = await response.json();

    if (data.status === 'success' && data.names) {
      this.allowedNames = data.names;
    }
  }

  // 根據使用者抽題邏輯取得題目
  // 第一次抽題:從 Google Sheets Records 判斷
  // 之後:從認識層和深度層混合抽取
  async getRandomQuestion(userName: string): Promise<string> {
    // 先查詢 Google Sheets 是否有該使用者紀錄
    const records = await this.loadRecords();
    const hasRecord = records.some(r => r.name.toLowerCase() === userName.toLowerCase());

    if (!hasRecord) {
      // 第一次抽題:只從破冰層抽
      return this.getRandomFromArray(this.questionCategories.iceBreaking);
    } else {
      // 之後:從認識層和深度層混合抽取
      const combinedQuestions = [
        ...this.questionCategories.gettingToKnow,
        ...this.questionCategories.deepConnection
      ];
      return this.getRandomFromArray(combinedQuestions);
    }
  }

  // 從陣列中隨機取得一個元素
  private getRandomFromArray(array: Array<string>): string {
    if (array.length === 0) {
      return '目前沒有可用的題目';
    }
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
  }

  // 取得允許的名字清單
  getAllowedNames(): Array<string> {
    return this.allowedNames;
  }

  // 檢查名字是否允許
  isNameAllowed(name: string): boolean {
    return this.allowedNames.includes(name.toLowerCase());
  }

  // 新增記錄
  async addRecord(name: string, question: string): Promise<void> {
    const record: QuestionRecord = {
      name,
      question,
      timestamp: new Date()
    };

    // 同步到 Google Sheets
    await this.saveToGoogleSheets(record);
  }

  // 同步資料到 Google Sheets
  private async saveToGoogleSheets(record: QuestionRecord): Promise<void> {
    await fetch(this.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script 需要使用 no-cors 模式
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: record.name,
        question: record.question,
        timestamp: record.timestamp.toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      })
    });
  }

  // 從 Google Sheets 讀取記錄 (使用 JSONP 避開 CORS)
  async loadRecords(): Promise<Array<QuestionRecord>> {
    return new Promise((resolve) => {
      const callbackName = 'googleSheetsCallback_' + Date.now();
      (window as any)[callbackName] = (data: any) => {
        // 清理
        delete (window as any)[callbackName];
        const script = document.getElementById(callbackName);
        if (script) {
          script.remove();
        }

        if (data.status === 'success' && Array.isArray(data.records)) {
          const records = data.records
            .filter((record: any) => record.name)
            .map((record: any) => ({
              name: record.name || '',
              question: record.question || '',
              timestamp: record.timestamp ? new Date(record.timestamp) : new Date()
            }));
          resolve(records);
        } else {
          resolve([]);
        }
      };

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `${this.GOOGLE_SCRIPT_URL}?callback=${callbackName}`;
      script.onerror = () => {
        delete (window as any)[callbackName];
        resolve([]);
      };

      document.head.appendChild(script);
    });
  }
}
