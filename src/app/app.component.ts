import { Component, OnInit } from '@angular/core';
import { ExcelService, QuestionRecord } from './excel.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  // 輸入區的變數
  inputName: string = '';
  
  // 翻牌顯示的變數 (抽到題目的人)
  drawnName: string = '';
  drawnQuestion: string = '';
  
  // 動畫控制
  isFlipping: boolean = false;  // 控制翻牌動畫
  showQuestion: boolean = false;  // 控制題目顯示
  isDrawing: boolean = false;  // 控制按鈕 disabled 狀態
  
  // 倒數計時
  countdown: number = 0;
  private countdownInterval: any;
  
  // 記錄列表
  records: QuestionRecord[] = [];
  isLoadingRecords: boolean = false;

  constructor(private excelService: ExcelService) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  async loadRecords() {
    this.isLoadingRecords = true;
    try {
      const records = await this.excelService.loadRecords();
      this.records = records || [];
    } catch (error) {
      this.records = [];
    } finally {
      this.isLoadingRecords = false;
    }
  }

  // 抽題
  drawQuestion(): void {
    // 開始翻轉動畫,禁用按鈕
    this.isFlipping = true;
    this.showQuestion = false;
    this.isDrawing = true;

    // 模擬抽題過程 (800ms 翻牌動畫)
    setTimeout(() => {
      // 將輸入的名字和抽到的題目存到翻牌顯示變數
      this.drawnName = this.inputName;
      // 根據使用者名稱取得對應的題目 (第一次抽破冰層,之後抽認識層+深度層)
      this.drawnQuestion = this.excelService.getRandomQuestion(this.inputName);
      
      // 顯示題目 (保持翻轉狀態,但按鈕可用)
      this.showQuestion = true;
      this.isDrawing = false;  // 恢復按鈕
      // isFlipping 保持 true,讓卡片繼續顯示背面
      
      // 清空輸入欄位,準備下一位使用者
      this.inputName = '';
      
      // 儲存記錄
      this.excelService.addRecord(this.drawnName, this.drawnQuestion).then(() => {
        this.loadRecords();
      });
      
      // 開始 10 秒倒數
      this.startCountdown(10);
    }, 800);
  }

  // 開始倒數計時
  startCountdown(seconds: number): void {
    // 清除之前的倒數
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.countdown = seconds;
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.reset();
      }
    }, 1000);
  }

  // 重置 (手動重置或倒數結束後自動重置)
  reset(): void {
    // 清除倒數計時器
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.inputName = '';
    this.drawnName = '';
    this.drawnQuestion = '';
    this.showQuestion = false;
    this.isFlipping = false;
    this.isDrawing = false;
    this.countdown = 0;
  }

  // 檢查輸入的名字是否有效
  isNameValid(): boolean {
    if (!this.inputName.trim()) {
      return false;
    }
    const normalizedName = this.inputName.trim().toLowerCase();
    return this.excelService.isNameAllowed(normalizedName);
  }

  // 手動重新整理記錄
  refreshRecords(): void {
    this.loadRecords();
  }
}
