import 'chart.js/auto'
import { Component, inject, computed, signal, ViewChild } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { DataService, CATEGORY_MAP, PREF_MAP } from '../data.service';
import { SelectTree, SelectNode } from '../../selectTree/selectTree';
import { ChartData, ChartOptions, ChartDataset, 
  Chart, ChartEvent, LegendElement, LegendItem } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
Chart.register(
  ChartDataLabels
);

type BorderStyle = { color: string; dash: number[]; width: number; };

const BORDER_STYLE: Record<keyof typeof CATEGORY_MAP, BorderStyle> = {
  特定集中治療室管理料1: { color: 'rgba(200, 0, 0, 1)', dash: [], width: 2 },
  特定集中治療室管理料2: { color: 'rgba(200, 0, 0, 1)', dash: [5, 5], width: 2 },
  特定集中治療室管理料3: { color: 'rgba(255, 100, 100, 1)', dash: [], width: 2 },
  特定集中治療室管理料4: { color: 'rgba(255, 100, 100, 1)', dash: [5, 5], width: 2 },
  特定集中治療室管理料5: { color: 'rgba(252, 164, 164, 1)', dash: [], width: 2 },
  特定集中治療室管理料6: { color: 'rgba(252, 164, 164, 1)', dash: [5, 5], width: 2 },
  救命救急入院料1: { color: 'rgba(0, 0, 255, 1)', dash: [], width: 2 },
  救命救急入院料2: { color: 'rgba(0, 0, 255, 1)', dash: [5, 5], width: 2 },
  救命救急入院料3: { color: 'rgba(173, 216, 230, 1)', dash: [], width: 2 },
  救命救急入院料4: { color: 'rgba(173, 216, 230, 1)', dash: [5, 5], width: 2 },
  小児特定集中治療室管理料: { color: 'rgba(255, 255, 0, 1)', dash: [], width: 2 },
  ハイケアユニット入院医療管理料1: { color: 'rgba(0, 128, 0, 1)', dash: [], width: 2 },
  ハイケアユニット入院医療管理料2: { color: 'rgba(0, 128, 0, 1)', dash: [5, 5], width: 2 },
  脳卒中ケアユニット入院医療管理料: { color: 'rgba(128, 0, 128, 1)', dash: [], width: 2 },
}

@Component({
  selector: 'app-line-chart',
  imports: [BaseChartDirective, SelectTree],
  templateUrl: './linechart.html',
  styleUrl: './linechart.scss'
})
export class LineChart {
  private readonly dataService = inject(DataService);
  readonly rawRows = this.dataService.rawRows;

  // --- 都道府県選択の設定 ---
  readonly prefMap = new Map(Object.entries(PREF_MAP).map(([k, v]) => [Number(k), v]));
  readonly selectedPrefCode = signal<number>(1);

  onPrefChange(event: Event) {
    const selectElement = event.target;
    if (!(selectElement instanceof HTMLSelectElement)) return;
    this.selectedPrefCode.set(Number(selectElement.value));
  }
  // ------------------

  // --- カテゴリ選択の設定 ---
  private readonly getCategoryTreeData = (): SelectNode[] => {
    const categoryNodes: SelectNode[] = [];
    Object.keys(CATEGORY_MAP).forEach(categoryKey => {
      const categoryNode: SelectNode = { name: categoryKey, checked: true };
      const categoryGroup = categoryKey.replace(/\d+$/, '');
      const groupNode = categoryNodes.find(node => node.name === categoryGroup);
      if (categoryGroup === categoryKey) {
        // グループ名とカテゴリ名が同じ場合はそのまま追加
        categoryNodes.push(categoryNode);
      } else if (!groupNode) {
        categoryNodes.push({ name: categoryGroup, children: [categoryNode] });
      } else {
        groupNode.children = groupNode.children || [];
        groupNode.children.push(categoryNode);
      }
    });
    return categoryNodes;
  };

  readonly categoryTreeData = signal<SelectNode[]>(this.getCategoryTreeData());
  // 選択されたカテゴリの一覧
  readonly selectedCategories = computed<string[]>(() => {
    const categoryTreeData = this.categoryTreeData();
    const acc: string[] = [];
    const traverseNodes = (nodes: SelectNode[]) => {
      nodes.forEach(node => {
        if (!node.children || node.children.length === 0) {
          if (node.checked) {
            acc.push(node.name);
          }
        } else {
          traverseNodes(node.children);
        }
      });
    };
    traverseNodes(categoryTreeData);
    return acc;
  });

  readonly hiddenCategorySelect = signal<boolean>(false);
  readonly clickCategorySelectButton = () => {
    this.hiddenCategorySelect.set(!this.hiddenCategorySelect());
  };
  // ------------------

  // --- Chartの設定 ---
  readonly chartType = 'line';
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective<typeof this.chartType>;

  readonly labels = computed<string[]>(() => {
    return this.dataService.availableYears().slice().reverse();
  });

  readonly chartData = computed<ChartData<typeof this.chartType>>(() => {
    const prefCode = this.selectedPrefCode();
    const labels = this.labels();
    const rawRows = this.rawRows();

    if (labels.length === 0) {
      return { labels: [], datasets: [] };
    }

    const filteredData: { label: string; values: number[] }[] = Object.keys(BORDER_STYLE).map(category => ({
      label: category,
      values: Array<number>(labels.length).fill(0)
    }));

    rawRows.forEach(row => {
      if (row.都道府県コード !== prefCode) return;

      const year = row.年度;
      const category = row.入院基本料カテゴリ;
      const categoryData = filteredData.find(d => d.label === category);
      if (categoryData) {
        const yearIndex = labels.indexOf(year);
        if (yearIndex !== -1) {
          categoryData.values[yearIndex] += row.病床数;
        }
      }
      // カテゴリが存在しない場合はスキップ
    });

    const datasets: ChartDataset<typeof this.chartType>[] = filteredData.map(({ label: category, values }) => {
      return {
        label: CATEGORY_MAP[category]?.shortName ?? category,
        borderColor: BORDER_STYLE[category]?.color ?? 'rgba(0,0,0,1)',
        borderDash: BORDER_STYLE[category]?.dash ?? [],
        borderWidth: BORDER_STYLE[category]?.width ?? 2,
        backgroundColor: 'rgba(0,0,0,0)',
        hidden: !this.selectedCategories().includes(category),
        categoryKey: category,
        data: values,
      }
    });
    return { labels: labels, datasets };
  });

  readonly chartOptions: ChartOptions<typeof this.chartType> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        onClick: (evt, legendItem, legend) => this.legendClickHandler(evt, legendItem, legend),
      },
      title: {
        display: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        offset: -10,
        color: 'black',
        font: {
          size: 15,
        },
      },
    },
  };

  private legendClickHandler(
    evt: ChartEvent,
    legendItem: LegendItem,
    legend: LegendElement<typeof this.chartType>
  ) {
    const defaultHandler = Chart.defaults.plugins?.legend?.onClick;
    if (defaultHandler) {
      defaultHandler.call(legend, evt, legendItem, legend);
    }

    const chart = legend.chart;
    const datasetIndex = legendItem.datasetIndex;
    if (!chart || datasetIndex === undefined) return;

    const dataset = chart.data.datasets[datasetIndex] as ChartDataset<typeof this.chartType> & { categoryKey?: string };
    const categoryKey = dataset?.categoryKey
    if (categoryKey) {
      const updateNode = (node: SelectNode): SelectNode => {
        if (node.name === categoryKey && (!node.children || node.children.length === 0)) {
          return { ...node, checked: !(node.checked ?? false) };
        } else if (node.children) {
          const updatedChildren = node.children.map(updateNode);
          if (updatedChildren.some((child, i) => child !== node.children![i])) {
            return { ...node, children: updatedChildren };
          }
        }
        return node;
      };
      this.categoryTreeData.set(
        this.categoryTreeData().map(updateNode)
      );
    }
  }

  // ------------------
}
