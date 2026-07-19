import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanPremium } from './plan-premium';

describe('PlanPremium', () => {
  let component: PlanPremium;
  let fixture: ComponentFixture<PlanPremium>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanPremium]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanPremium);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
