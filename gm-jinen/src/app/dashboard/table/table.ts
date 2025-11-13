import { Component, computed, inject, signal, effect } from '@angular/core';
import { DataService, PREF_MAP, CATEGORY_MAP } from '../data.service';

@Component({
  selector: 'app-table',
  imports: [],
  templateUrl: './table.html',
  styleUrl: './table.scss'
})
export class Table {
  private readonly dataService = inject(DataService);
  readonly rawRows = this.dataService.rawRows;
  
  readonly availableYears = computed(() => Array.from(new Set(this.rawRows().map(row => row.年度))).sort().reverse());
  readonly selectedYear = signal<string>('');

  constructor() {
    effect(() => {
      this.selectedYear.set(this.availableYears()[0] || '');
    });
  }

  onYearChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedYear.set(selectElement.value);
  }

  readonly columnNames = [
    '特定集中治療室管理料1',
    '特定集中治療室管理料2',
    '特定集中治療室管理料3',
    '特定集中治療室管理料4',
    '特定集中治療室管理料5',
    '特定集中治療室管理料6',
    '救命救急入院料2',
    '救命救急入院料4',
    '小児特定集中治療室管理料',
    '救命救急入院料1',
    '救命救急入院料3',
    'ハイケアユニット入院医療管理料1',
    'ハイケアユニット入院医療管理料2',
    '脳卒中ケアユニット入院医療管理料',
    '合計'
  ];
  readonly columnDisplayNames = Array.from(this.columnNames, name =>
    CATEGORY_MAP[name]?.shortName ?? name
  );
  readonly indexNames = Object.values(PREF_MAP);

  readonly rows = computed(() => {
    const rawRows = this.rawRows(); 
    const data = this.columnNames.reduce((acc, col) => {
      acc.set(col, new Map(this.indexNames.map(index => [index, 0])));
      return acc;
    }, new Map<string, Map<string, number>>());

    for (const row of rawRows) {
      if (row.年度 !== this.selectedYear()) continue;
      data.get(row.入院基本料カテゴリ)?.set(PREF_MAP[row.都道府県コード], (data.get(row.入院基本料カテゴリ)?.get(PREF_MAP[row.都道府県コード]) ?? 0) + row.病床数);
      data.get('合計')?.set(PREF_MAP[row.都道府県コード], (data.get('合計')?.get(PREF_MAP[row.都道府県コード]) ?? 0) + row.病床数);
    }
    return data;
  });

  readonly sumRows = computed(() => {
    return new Map<string, number>(this.columnNames.map(col => {
      const rowMap = this.rows().get(col);
      let sum = 0;
      if (rowMap) {
        for (const val of rowMap.values()) {
          sum += val;
        }
      }
      return [col, sum];
    }));
  });
}
