import { Component, signal, computed, input, output, effect } from '@angular/core';
import { SECONDARY_MEDICAL_AREAS, PREF_MAP, SecondaryMedicalArea } from '../dashboard/data.service';

@Component({
  selector: 'app-secondary-area-tree-checkbox',
  imports: [],
  templateUrl: './secondary-area-tree-checkbox.html',
  styleUrl: './secondary-area-tree-checkbox.scss'
})
export class SecondaryAreaTreeCheckbox {
  readonly selectedYear = input.required<string>(); // 年度選択信号を受け取る
  readonly availableAreasOutput = output<SecondaryMedicalArea[]>({"alias": "availableAreas"}); // 利用可能な二次医療圏リスト信号を受け取る
  readonly hiddenAreasInput = output<string[]>({"alias": "hiddenAreas"}); // 非表示の二次医療圏コードリスト信号を受け取る

  readonly availableAreas = computed(
    () => SECONDARY_MEDICAL_AREAS
      .filter(area => area['年度'] === this.selectedYear())
      .filter((area, index, self) =>
        self.findIndex(a => a['二次医療圏コード'] === area['二次医療圏コード']) === index
      )
      .sort((a, b) => {
        if (a['都道府県コード'] !== b['都道府県コード']) {
          return a['都道府県コード'] - b['都道府県コード'];
        }
        return a['二次医療圏コード'].localeCompare(b['二次医療圏コード']);
      })
  );

  constructor() {
    effect(() => {
      this.availableAreasOutput.emit(this.availableAreas());
    });
    effect(() => {
      this.hiddenAreasInput.emit(this.hiddenAreas());
    });
  }
  
  readonly preferredAreas = Object.entries(PREF_MAP)
      .map(([code, name]) => ({ code: Number(code), name }))
      .sort((a, b) => a.code - b.code);

  // --- エリアフィルタリング関連 ---
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

  readonly hiddenAreaSelect = signal(true);
  public clickAreaSelectButton = () => {
    this.hiddenAreaSelect.set(!this.hiddenAreaSelect());
  }

  readonly openedPrefCodeAccordion = signal(0);
  public togglePrefCodeAccordion = (code: number) => {
    if (this.openedPrefCodeAccordion() === code) {
      this.openedPrefCodeAccordion.set(0);
    } else {
      this.openedPrefCodeAccordion.set(code);
    }
  }

  readonly hiddenAreas = signal<string[]>([]);
  readonly selectAreas = (code: string|number) => {
    if (code === 'all') {
      // 全選択/全解除の処理
      if (this.hiddenAreas().length === 0) {
        const allAreaCodes = Array.from(
          new Set(
            this.availableAreas()
              .map(area => area['二次医療圏コード'])
          )
        );
        this.hiddenAreas.set(allAreaCodes);
      } else {
        this.hiddenAreas.set([]);
      }
    } else if (typeof code === 'number' 
      && this.preferredAreas.map(pref => pref.code).includes(code)) {
      // PrefCodeが選択された場合の処理
      const areasInPref = this.availableAreas()
        .filter(area => area['都道府県コード'] === code)
        .map(area => area['二次医療圏コード']);
      const hiddenAreas = this.hiddenAreas();
      const allHidden = areasInPref.every(areaCode => hiddenAreas.includes(areaCode));
      if (allHidden) {
        // すべて非表示の場合は表示に変更
        this.hiddenAreas.set(
          hiddenAreas.filter(code => !areasInPref.includes(code))
        );
      } else {
        // 一部でも表示されている場合はすべて非表示に変更
        this.hiddenAreas.set([
          ...hiddenAreas,
          ...areasInPref.filter(areaCode => !hiddenAreas.includes(areaCode))
        ]);
      }
    } else if (typeof code === 'string' 
      && SECONDARY_MEDICAL_AREAS.some(area => area['二次医療圏コード'] === code)) {
      // AreaCodeが選択された場合の処理
      const hiddenAreas = this.hiddenAreas();
      if (hiddenAreas.includes(code)) {
        // 非表示リストにある場合は削除（表示）
        this.hiddenAreas.set(hiddenAreas.filter(c => c !== code));
      } else {
        // 非表示リストにない場合は追加（非表示）
        this.hiddenAreas.set([...hiddenAreas, code]);
      }
    } else {
      // 無効なコードの場合は何もしない
      return;
    }
  }

  // code('all'|PrefCode|AreaCode)が選択されているか
  readonly isAreaSelected = (code: string|number) => {
    if (code === 'all') {
      return this.hiddenAreas().length === 0;
    } else if (typeof code === 'number' && this.preferredAreas.map(pref => pref.code).includes(code)) {
      return this.availableAreas().filter(area => area['都道府県コード'] === code).some(area => !this.hiddenAreas().includes(area['二次医療圏コード']));
    } else if (typeof code === 'string' && SECONDARY_MEDICAL_AREAS.some(area => area['二次医療圏コード'] === code)) {
      return !this.hiddenAreas().includes(code);
    }
    return false;
  }

  readonly indeterminate = (code: string|number) => {
    if (code === 'all') {
      return this.hiddenAreas().length > 0 && this.hiddenAreas().length < this.availableAreas().length;
    } else if (typeof code === 'number' && this.preferredAreas.map(pref => pref.code).includes(code)) {
      const areasInPref = this.availableAreas().filter(area => area['都道府県コード'] === code)
        .map(area => area['二次医療圏コード']);
      const hiddenAreas = this.hiddenAreas();
      const hiddenCount = areasInPref.filter(areaCode => hiddenAreas.includes(areaCode)).length;
      return hiddenCount > 0 && hiddenCount < areasInPref.length;
    }
    return false;
  }
  // -----------------------------
}
