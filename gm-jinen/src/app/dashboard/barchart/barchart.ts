import { Component, inject, signal, Signal, computed, effect, ViewChild } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartDataset, Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
Chart.register(
  ChartDataLabels
);
import {
  DataService,
  SECONDARY_MEDICAL_AREAS,
  CATEGORY_MAP,
  PREF_MAP,
  SecondaryMedicalArea
} from '../data.service';
import { SecondaryAreaTreeCheckbox } from '../../secondary-area-tree-checkbox/secondary-area-tree-checkbox';

type RowMap = {
  [year: string]: {
    [prefCode: number]: {
      [areaCode: string]: {
        [category: string]: {
          '病床数': number;
          '医療機関数': number;
        };
      };
    };
  }
}

// バーの色設定
type BorderStyle = { color: string; };
const BORDER_STYLE: Record<string, BorderStyle> = {
  特定集中治療室管理料1: {color: 'rgba(200, 0, 0, 1)'},
  特定集中治療室管理料2: {color: 'rgba(228, 50, 50, 1)'}, 
  特定集中治療室管理料3: {color: 'rgba(255, 100, 100, 1)'},
  特定集中治療室管理料4: {color: 'rgba(254, 132, 132, 1)'},
  特定集中治療室管理料5: {color: 'rgba(252, 164, 164, 1)'},
  特定集中治療室管理料6: {color: 'rgba(252, 213, 213, 1)'},
  救命救急入院料1: {color: 'rgba(0, 0, 255, 1)'},
  救命救急入院料2: {color: 'rgba(110, 110, 244, 1)'},
  救命救急入院料3: {color: 'rgba(71, 209, 255, 1)'},
  救命救急入院料4: {color: 'rgba(173, 216, 230, 1)'},
  小児特定集中治療室管理料: {color: 'rgba(255, 255, 0, 1)'},
  ハイケアユニット入院医療管理料1: {color: 'rgba(0, 110, 0, 1)'},
  ハイケアユニット入院医療管理料2: {color: 'rgba(99, 245, 99, 1)'},
  脳卒中ケアユニット入院医療管理料: {color: 'rgba(128, 0, 128, 1)'},
}

@Component({
  selector: 'app-barchart',
  imports: [BaseChartDirective, SecondaryAreaTreeCheckbox],
  templateUrl: './barchart.html',
  styleUrl: './barchart.scss'
})
export class Barchart {
  private readonly dataService = inject(DataService);
  private readonly rawRows = this.dataService.rawRows;
  readonly rowMap = computed(() => {
    const rawRows = this.rawRows();
    const map: RowMap = {};
    for (const row of rawRows) {
      const year = row['年度'];
      const prefCode = row['都道府県コード'];
      const areaCode = row['二次医療圏コード'];
      const category = row['入院基本料カテゴリ'];
      if (!map[year]) {
        map[year] = {};
      }
      if (!map[year][prefCode]) {
        map[year][prefCode] = {};
      }
      if (!areaCode) continue;
      if (!map[year][prefCode][areaCode]) {
        map[year][prefCode][areaCode] = {};
      }
      if (!map[year][prefCode][areaCode][category]) {
        map[year][prefCode][areaCode][category] = {
          '病床数': 0,
          '医療機関数': 0
        };
      }
      map[year][prefCode][areaCode][category]['病床数'] += row['病床数'];
      map[year][prefCode][areaCode][category]['医療機関数'] += row['医療機関数'];
    }
    return map;
  });
  readonly secondaryMedicalAreas = SECONDARY_MEDICAL_AREAS;
  readonly availableYears = this.dataService.availableYears;
  readonly preferredAreas = Object.entries(PREF_MAP)
    .map(([code, name]) => ({ code: Number(code), name }))
    .sort((a, b) => a.code - b.code);

  readonly availablePrefs = computed<{code: number, name: string, areas: {code: string, name: string}[]}[]>(() => {
      const prefs = new Map<number, {code: number, name: string, areas: {code: string, name: string}[]}>();
      for (const area of this.availableAreas()) {
        const prefCode = area['都道府県コード'];
        const prefName = area['都道府県名'];
        const areaCode = area['二次医療圏コード'];
        const areaName = area['二次医療圏名'];
        if (!prefs.has(prefCode)) {
          prefs.set(prefCode, {code: prefCode, name: prefName, areas: []});
        }
        prefs.get(prefCode)?.areas.push({code: areaCode, name: areaName});
      }
      return Array.from(prefs.values()).sort((a, b) => a.code - b.code);
    });
  // --- 年度選択関連 ---
  readonly selectedYear = signal('');
  constructor() {
    effect(() => {
      this.selectedYear.set(this.availableYears()[0] || '');
    });
  }
  onYearChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedYear.set(selectElement.value);
  }
  // ---------------------

  // --- 二次医療圏フィルタリング関連 ---
  readonly availableAreas = signal<SecondaryMedicalArea[]>([]); // set by SecondaryAreaTreeCheckbox
  readonly hiddenAreas = signal<string[]>([]); // set by SecondaryAreaTreeCheckbox
  readonly isAreaSelected = (areaCode: string): boolean => {
    return !this.hiddenAreas().includes(areaCode);
  }

  readonly hiddenAreaSelect = signal(true);
  public clickAreaSelectButton = () => {
    this.hiddenAreaSelect.set(!this.hiddenAreaSelect());
  }
  // --- 二次医療圏フィルタリング関連ここまで ---

  // --- グラフ関連 ---
  readonly chartType = 'bar' as const;
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective<typeof this.chartType>;

  readonly chartData: Signal<ChartData> = computed(() => {
    const year = this.selectedYear();
    const rowMap = this.rowMap();
    const hiddenAreas = this.hiddenAreas();
    const categories = Object.keys(CATEGORY_MAP);
    const availablePrefs = this.availablePrefs();

    const labels = availablePrefs
      .map(pref => pref.areas)
      .flat()
      .filter(area => !hiddenAreas.includes(area.code))
      .map(area => area.name);
    const datasets: ChartDataset<typeof this.chartType>[] = categories.map(category => {
      const data: number[] = [];
      for (const pref of availablePrefs) {
        for (const area of pref.areas) {
          if (hiddenAreas.includes(area.code)) {
            continue;
          }
          const value = rowMap[year]?.[pref.code]?.[area.code]?.[category]?.['病床数'] || 0;
          data.push(value);
        }
      }
      return {
        label: category,
        data: data,
        backgroundColor: BORDER_STYLE[category]?.color || 'rgba(0,0,0,1)'
      };
    });

    return {
      labels: labels,
      datasets: datasets
    };
  });
  readonly chartOptions: Signal<ChartOptions> = computed(() => {
    return {
      responsive: true,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: '病床数'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.raw || 0;
              return `${label}: ${value}`;
            }
          }
        }
      }
    };
  });

  // ---------------------
}
