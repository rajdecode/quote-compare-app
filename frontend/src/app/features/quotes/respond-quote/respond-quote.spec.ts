import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RespondQuote } from './respond-quote';

describe('RespondQuote', () => {
  let component: RespondQuote;
  let fixture: ComponentFixture<RespondQuote>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RespondQuote]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RespondQuote);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
