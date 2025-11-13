import { Component, inject, computed, signal, effect } from '@angular/core';
import { DataService, CATEGORY_MAP } from '../data.service';

type sumBedType = '総病床数' | 'ICU病床数' | '準ICU病床数';

@Component({
  selector: 'app-metrics',
  imports: [],
  templateUrl: './metrics.html',
  styleUrl: './metrics.scss'
})
export class Metrics {
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

  sumBedCount = (target: sumBedType): number => {
    const year = this.selectedYear();
    switch (target) {
      case '総病床数':
        return this.rawRows().reduce((sum, row) => sum + (row.年度 === year ? row.病床数 : 0), 0);
      case 'ICU病床数':
        return this.rawRows().reduce((sum, row) => {
          const category = CATEGORY_MAP[row.入院基本料カテゴリ];
          return sum + (category?.subCategory === 'ICU' && row.年度 === year ? row.病床数 : 0);
        }, 0);
      case '準ICU病床数':
        return this.rawRows().reduce((sum, row) => {
          const category = CATEGORY_MAP[row.入院基本料カテゴリ];
          return sum + (category?.subCategory === '準ICU' && row.年度 === year ? row.病床数 : 0);
        }, 0);
    }
  };

}
