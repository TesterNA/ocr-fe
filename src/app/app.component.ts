import {Component, inject} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import {PreprocessService} from "./services/preprocess.service";
import {TesseractService} from "./services/tesseract.service";
import {AFFIXES, Categories, Equipments, Rarities, UNIQUES} from "./consts";
import {FuzzyMatchService} from "./services/fuzzy-match.service";
import {DropFileComponent} from "./drop-file/drop-file.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DropFileComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'] // fixed typo: styleUrl to styleUrls
})
export class AppComponent {
  title = 'free-ocr';
}
