import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectTree } from './selectTree';

describe('SelectTree', () => {
  let component: SelectTree;
  let fixture: ComponentFixture<SelectTree>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectTree]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectTree);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
