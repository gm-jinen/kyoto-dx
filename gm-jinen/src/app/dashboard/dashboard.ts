import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { DataService, CATEGORY_MAP } from './data.service';
import { LineChart } from './linechart/linechart';
import { Table } from './table/table';
import { SecondaryTable } from './secondaryTable/secondaryTable';
import { Metrics } from './metrics/metrics';
import { Barchart } from './barchart/barchart';

@Component({
  selector: 'app-dashboard',
  imports: [LineChart, Table, SecondaryTable, Metrics, Barchart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private readonly dataService = inject(DataService);
  readonly rawRows = this.dataService.rawRows;

  async ngOnInit() {
    await this.dataService.fetchData().then(response => {
      console.log('Data fetched successfully');
      if (this.rawRows().length === 0) {
        alert('データが存在しません。');
      }
    }).catch(error => {
      console.error('Error fetching data:', error.message);
      alert('データの取得に失敗しました。');
    });
  }
}
