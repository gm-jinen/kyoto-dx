import { Component, inject, signal, computed, effect } from '@angular/core';
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

@Component({
  selector: 'app-secondary-table',
  imports: [SecondaryAreaTreeCheckbox],
  templateUrl: './secondaryTable.html',
  styleUrl: './secondaryTable.scss'
})
export class SecondaryTable {
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
  readonly categoryMap = new Map(Object.entries(CATEGORY_MAP));
  readonly preferredAreas = Object.entries(PREF_MAP)
    .map(([code, name]) => ({ code: Number(code), name }))
    .sort((a, b) => a.code - b.code);
  
  readonly availableYears = this.dataService.availableYears;
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

  readonly filteredColumns = [
    '都道府県',
    '二次医療圏',
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
    '脳卒中ケアユニット入院医療管理料'
  ];
  getRowData = (area: SecondaryMedicalArea, category: string) => {
    const year = this.selectedYear();
    const rowMap = this.rowMap();
    return rowMap[year]
      ?.[area['都道府県コード']]
      ?.[area['二次医療圏コード']]
      ?.[category]
      ?.['病床数'] ?? 0;
  }

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
}
