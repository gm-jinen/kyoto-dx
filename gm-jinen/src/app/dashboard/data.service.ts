import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import secondaryMedicalAreaData from './二次医療圏と構想区域の組合せ_R5-R6.json';

export type Row = {
  年度: string;
  都道府県コード: number;
  都道府県名: string;
  二次医療圏コード?: string;
  二次医療圏名?: string;
  入院基本料カテゴリ: string;
  病床数: number;
  医療機関数: number;
};

function isRow(obj: any): obj is Row {
  return obj &&
    typeof obj.年度 === 'string' &&
    typeof obj.都道府県コード === 'number' &&
    typeof obj.都道府県名 === 'string' &&
    (typeof obj.二次医療圏コード === 'string' || obj.二次医療圏コード === null || obj.二次医療圏コード === undefined) &&
    (typeof obj.二次医療圏名 === 'string' || obj.二次医療圏名 === null || obj.二次医療圏名 === undefined) &&
    typeof obj.入院基本料カテゴリ === 'string' &&
    typeof obj.病床数 === 'number' &&
    typeof obj.医療機関数 === 'number';
}

export type SecondaryMedicalArea = {
  "都道府県コード": number;
  "都道府県名": string;
  "二次医療圏コード": string;
  "二次医療圏名": string;
  "構想区域コード": string;
  "構想区域名": string;
  "年度": string;
};

export const SECONDARY_MEDICAL_AREAS: SecondaryMedicalArea[] = secondaryMedicalAreaData;

export const PREF_MAP: Record<number, string> = {
  1: '北海道', 2: '青森県', 3: '岩手県', 4: '宮城県', 5: '秋田県', 6: '山形県', 7: '福島県',
  8: '茨城県', 9: '栃木県', 10: '群馬県', 11: '埼玉県', 12: '千葉県', 13: '東京都', 14: '神奈川県',
  15: '新潟県', 16: '富山県', 17: '石川県', 18: '福井県', 19: '山梨県', 20: '長野県',
  21: '岐阜県', 22: '静岡県', 23: '愛知県', 24: '三重県',
  25: '滋賀県', 26: '京都府', 27: '大阪府', 28: '兵庫県', 29: '奈良県', 30: '和歌山県',
  31: '鳥取県', 32: '島根県', 33: '岡山県', 34: '広島県', 35: '山口県',
  36: '徳島県', 37: '香川県', 38: '愛媛県', 39: '高知県',
  40: '福岡県', 41: '佐賀県', 42: '長崎県', 43: '熊本県', 44: '大分県', 45: '宮崎県', 46: '鹿児島県', 47: '沖縄県',
};

type CategoryInfo = { shortName: string; subCategory: 'ICU' | '準ICU';};

export const CATEGORY_MAP: Record<string, CategoryInfo> = {
  ハイケアユニット入院医療管理料1: {shortName: 'ハイ1', subCategory: '準ICU'},
  ハイケアユニット入院医療管理料2: {shortName: 'ハイ2', subCategory: '準ICU'},
  小児特定集中治療室管理料: {shortName: '小児', subCategory: 'ICU'},
  救命救急入院料1: {shortName: '救命1', subCategory: '準ICU'},
  救命救急入院料2: {shortName: '救命2', subCategory: 'ICU'},
  救命救急入院料3: {shortName: '救命3', subCategory: '準ICU'},
  救命救急入院料4: {shortName: '救命4', subCategory: 'ICU'},
  特定集中治療室管理料1: {shortName: '集中1', subCategory: 'ICU'},
  特定集中治療室管理料2: {shortName: '集中2', subCategory: 'ICU'},
  特定集中治療室管理料3: {shortName: '集中3', subCategory: 'ICU'},
  特定集中治療室管理料4: {shortName: '集中4', subCategory: 'ICU'},
  特定集中治療室管理料5: {shortName: '集中5', subCategory: 'ICU'},
  特定集中治療室管理料6: {shortName: '集中6', subCategory: 'ICU'},
  脳卒中ケアユニット入院医療管理料: {shortName: '脳卒中', subCategory: '準ICU'}
};

export function warekiToSeireki(wareki: string): number | undefined {
  const eraMap: Record<string, number> = { H: 1988, R: 2018 };
  if (!wareki || wareki.length < 2) return undefined;
  const era = wareki[0];
  const year = Number(wareki.slice(1));
  if (!eraMap[era] || isNaN(year) || year < 1) return undefined;
  return eraMap[era] + year;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // private readonly data_path = '/assets/data/ICU集計_二次医療圏ごと_H28-R6.json'
  private readonly apiEndPoint = '/api/data';
  private readonly tableId = 'icu_by_secondary_areas';
  private readonly limit = 100000;
  private readonly httpParams = new HttpParams()
    .set('tableId', this.tableId)
    .set('limit', this.limit.toString());

  readonly rawRows = signal<Row[]>([]);
  readonly availableYears = computed(() => {
    // 設定可能な年度を降順で取得
    const yearsMap: Record<string, number> = {};
    const yearsSet = new Set(this.rawRows().map(row => row.年度));
    yearsSet.forEach(year => {
      const seireki = warekiToSeireki(year);
      if (seireki) {
        yearsMap[year] = seireki;
      }
    });
    return Object.keys(yearsMap).sort((a, b) => yearsMap[b] - yearsMap[a]);
  });

  constructor(private http: HttpClient) { }

  async fetchData(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.http.get<{rows: Row[]}>(this.apiEndPoint, { params: this.httpParams }).subscribe({
        next: data => {
          // 簡易な型チェック。
          if (!data?.rows || !Array.isArray(data.rows) || !data.rows.every(isRow)) {
            reject(new Error('無効なデータ形式'));
          } else {
            this.rawRows.set(data.rows);
            resolve();
          }
        },
        error: error => {
          reject(error);
        }
      });
    });
  }
}
