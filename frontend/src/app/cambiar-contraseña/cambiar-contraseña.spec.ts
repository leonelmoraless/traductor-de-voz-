import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CambiarContraseña } from './cambiar-contraseña';

describe('CambiarContraseña', () => {
  let component: CambiarContraseña;
  let fixture: ComponentFixture<CambiarContraseña>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CambiarContraseña]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CambiarContraseña);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
