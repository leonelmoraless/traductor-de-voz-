import { Component } from '@angular/core';
import { ImageCompareModule } from 'primeng/imagecompare';

@Component({
  selector: 'app-home-content',
  imports: [ImageCompareModule],
  templateUrl: './home-content.html',
  styleUrl: './home-content.scss',
})
export class HomeContent {}

