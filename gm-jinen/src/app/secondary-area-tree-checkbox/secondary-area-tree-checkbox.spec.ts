import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecondaryAreaTreeCheckbox } from './secondary-area-tree-checkbox';

describe('SecondaryAreaTreeCheckbox', () => {
  let component: SecondaryAreaTreeCheckbox;
  let fixture: ComponentFixture<SecondaryAreaTreeCheckbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecondaryAreaTreeCheckbox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecondaryAreaTreeCheckbox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
