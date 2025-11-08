import { Injectable } from '@angular/core';

export interface QuestionRecord {
  name: string;
  question: string;
  timestamp: Date;
}

export interface QuestionCategories {
  iceBreaking: string[];
  gettingToKnow: string[];
  deepConnection: string[];
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

  // 記錄每個人是否已經抽過第一次題目
  private userFirstDrawMap = new Map<string, boolean>();

  // Google Apps Script Web App URL (部署後取得)
  private readonly GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzI9mksv2aG38TbeGmUwx92L3ECCU2wudWvdwOQxwsuj2Iny0L95nVVBzxhpgjJ6jwI/exec';

  constructor() {
    this.loadQuestionsFromGoogleSheets();
  }

  // 從 Google Sheets 載入題目分類
  async loadQuestionsFromGoogleSheets(): Promise<void> {
    try {
      const response = await fetch(`${this.GOOGLE_SCRIPT_URL}?action=getQuestions`);
      const data = await response.json();
      
      if (data.status === 'success' && data.questions) {
        this.questionCategories = data.questions;
        console.log('載入題目分類:', {
          破冰層: this.questionCategories.iceBreaking.length,
          認識層: this.questionCategories.gettingToKnow.length,
          深度層: this.questionCategories.deepConnection.length
        });
      }
    } catch (error) {
      console.error('從 Google Sheets 載入題目失敗:', error);
      // 使用本地預設題目
      this.loadLocalQuestions();
    }
  }

  // 載入本地預設題目
  private loadLocalQuestions(): void {
    this.questionCategories = {
      iceBreaking: [
        '如果可以擁有一項超能力,你會選擇什麼?為什麼?',
        '分享一個你最近養成的小習慣',
        '你的「快樂清單」前三名是什麼?(食物/活動/地點)',
        '如果可以立刻學會一種技能,你會選什麼?',
        '你最喜歡的放鬆方式是什麼?',
        '分享一部對你影響深刻的電影/書籍',
        '你的理想週末是怎樣度過的?',
        '如果時間倒流,你最想回到人生的哪個時期?',
        '你有什麼特別的收藏嗎?背後有什麼故事?',
        '分享一個你最近發現的「寶藏」(餐廳/音樂/APP等)',
        '你最喜歡一天中的哪個時段?為什麼?',
        '如果可以和任何人(在世或已故)共進晚餐,你會選誰?',
        '你覺得自己是「晨型人」還是「夜型人」?',
        '分享一個讓你會心一笑的童年回憶',
        '你最近最感興趣的話題或新聞是什麼?'
      ],
      gettingToKnow: [
        '你在團隊合作中最重視什麼?為什麼?',
        '分享一次團隊合作讓你印象深刻的經驗(好的或壞的)',
        '你覺得自己在團隊中通常扮演什麼角色?(例如:協調者、執行者、創意發想者)',
        '當你在工作中遇到困難,你通常會怎麼處理?',
        '什麼樣的工作環境讓你覺得最有生產力?',
        '你認為一個好的團隊應該具備哪些特質?',
        '分享一次你在工作中從失敗或錯誤中學到的教訓',
        '在團隊討論中,你比較傾向先發言還是先聽別人的想法?',
        '什麼樣的回饋方式最能幫助你成長?',
        '當團隊意見不同時,你通常如何應對?',
        '你希望團隊成員如何支持你?',
        '分享一個你需要跨部門合作的經驗,你學到了什麼?',
        '你認為自己在工作上的優勢是什麼?可以如何貢獻團隊?',
        '在壓力或緊急狀況下,你會展現什麼特質?',
        '你最欣賞團隊成員身上的哪種工作特質或態度?'
      ],
      deepConnection: [
        '當團隊氛圍不好或有衝突時,你內心真實的感受是什麼?你希望如何改善?',
        '分享一次你在工作中感到不被理解或被誤解的經驗,後來如何解決?',
        '你覺得我們團隊目前最需要改善的是什麼?',
        '在工作中,什麼事情會讓你感到沮喪或無力?',
        '你希望在這個團隊中被如何對待?什麼會讓你覺得不被尊重?',
        '分享一次你不敢說出真實想法的經驗,為什麼不敢說?',
        '當你犯錯時,你希望團隊如何回應?',
        '你對這個團隊未來一年有什麼期待或建議?',
        '你覺得自己在工作上最需要團隊支持的地方是什麼?',
        '分享一次你想幫助團隊成員但不知道怎麼開口的經驗',
        '什麼樣的團隊溝通方式會讓你感到壓力或不舒服?',
        '你認為我們團隊最大的優勢和挑戰分別是什麼?',
        '如果可以改變團隊的一件事,你會改變什麼?為什麼?',
        '分享一次你在團隊中感到特別有歸屬感或被支持的時刻',
        '你想對團隊成員說些什麼,但平常不好意思說的話?'
      ]
    };
  }

  // 根據使用者抽題邏輯取得題目
  // 第一次抽題:從破冰層抽取
  // 之後:從認識層和深度層混合抽取
  getRandomQuestion(userName: string): string {
    const isFirstDraw = !this.userFirstDrawMap.get(userName);
    
    if (isFirstDraw) {
      // 第一次抽題:只從破冰層抽
      this.userFirstDrawMap.set(userName, true);
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
  private getRandomFromArray(array: string[]): string {
    if (array.length === 0) {
      return '目前沒有可用的題目';
    }
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
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
  async loadRecords(): Promise<QuestionRecord[]> {
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
