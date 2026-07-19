import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { RatingModule } from 'primeng/rating';


@Component({
  selector: 'app-user',
  imports: [TableModule, FormsModule, RatingModule],
  templateUrl: './user.html',
  styleUrl: './user.scss',
})
export class User {
  usuarios = [
    { id: 1, nombre: 'Karma', edad: 25, correo: 'karma@mail.com', telefono: '123456789' },
    { id: 2, nombre: 'Ana', edad: 30, correo: 'ana@mail.com', telefono: '987654321' },
    { id: 3, nombre: 'Luis', edad: 35, correo: 'luis@mail.com', telefono: '555555555' }
  ];

  value!: number;
}
