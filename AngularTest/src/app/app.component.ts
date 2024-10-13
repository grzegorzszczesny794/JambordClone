import { Component, OnInit } from '@angular/core';
import { PostService, Post } from '../services/post.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})

export class AppComponent implements OnInit {

  posts: Post[] = [];
  isLoading = true;
  error: string | null = null;
  title = 'AngularTest';
  data: Array<string> = [
    "Adam",
    "Marysia",
    "Roksana"
  ]

  constructor(private appService: PostService) { }

  ngOnInit(): void {
    this.fetchPosts();
  }

  public buttonClick(event: MouseEvent): void {
    this.isLoading = !this.isLoading;
  }

  fetchPosts(): void {
    this.appService.getPosts().subscribe({
      next: (data: Post[]) => {
        this.posts = data.slice(0, 5); 
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Wystąpił błąd podczas pobierania danych';
        this.isLoading = false;
        console.error('Error fetching posts:', err);
      }
    });
    
  }

}
