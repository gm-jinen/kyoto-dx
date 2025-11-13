import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecondaryTable } from './secondaryTable';

describe('SecondaryTable', () => {
  let component: SecondaryTable;
  let fixture: ComponentFixture<SecondaryTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecondaryTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecondaryTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
