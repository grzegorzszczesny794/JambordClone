import { Component } from '@angular/core';

@Component({
  selector: 'login-component',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})

export class LoginComponent {
  title = 'Login';
  isLoading = true;
  data: Array<string> = [
    "Adam",
    "Marysia",
    "Roksana"
  ]

  public buttonClick(event: MouseEvent): void {
    this.isLoading = !this.isLoading;
  }

}
