const express = require('express');
const router = express.Router();
const User = require('./../models/usermodel')
const Review = require('./../models/reviewsmodel');
const PopcornApi = require('../api/api');
const { populate } = require('./../models/usermodel');
const isLoggedIn = require('../middleware/isLoggedIn');
const Watchlist = require('../models/watchlistmodel');

router.get('/movie-detail/:movieId', (req, res)=> {
	const {movieId} = req.params 
	if (req.session.currentUser) {
		PopcornApi.getOneMovie(movieId)
			.then((movie)=> {
				Review.find({movie: movieId})
				.populate("user")
				.then((reviews)=> {
					movie.reviews = reviews

					Watchlist.findOne({"movie.id": movieId, user: req.session.currentUser._id})
						.then((watch) => {
							console.log('found', watch)
							movie.watchlist = watch;
							movie.credits.cast = movie.credits.cast.slice(0, 9)
                            movie.credits.crew = movie.credits.crew.slice(0, 4)
							res.render('movies/each-movie', {...movie, user: req.session.currentUser})
						})
						.catch((error) => {
							console.log(error)
						})
					
				})
			})
		} else {
			PopcornApi.getOneMovie(movieId)
			.then((movie)=>{
				movie.credits.cast = movie.credits.cast.slice(0, 9)
                movie.credits.crew = movie.credits.crew.slice(0, 4)
				res.render('movies/movie-detail-logout', {movie})
			})
		}
});

router.post('/movie-detail/:movieId/watchlist/add', (req, res) => {
	const {movieId} = req.params 

	PopcornApi.getOneMovie(movieId)
		.then((movie)=> {
			Watchlist.create({
				user: req.session.currentUser._id,
				movie: {
					id: movie.id,
					original_title: movie.title,
					poster_path: movie.poster_path,
				},
			}).then(() => res.redirect(`/movies/movie-detail/${movieId}`))
			
		})
		.catch((error) => console.log(error))
});


router.post('/movie-detail/:movieId/watchlist/remove', (req, res) => {
	const {movieId} = req.params 

	PopcornApi.getOneMovie(movieId)
		.then((movie)=> {
			Watchlist.findOne({"movie.id": movieId, user: req.session.currentUser._id})
				.then((watch) => {
					watch.remove()
						.then(() => res.redirect(`/movies/movie-detail/${movieId}`))
						.catch((error) => console.log(error))
				})
				.catch((error) => console.log(error))
		})
		.catch((error) => console.log(error))
});


router.post('/movie-detail/:id', (req, res) => {
	const movieId = req.params.id;
	const { comment } = req.body;

	Review.create({
		user: req.session.currentUser._id,
		movie: movieId,
		comment
	})
	.then((newReview) => res.redirect(`/movies/movie-detail/${movieId}`))
	.catch((error) => console.log(error))
});


router.post('/movie-detail/:movieId/delete/:reviewId', (req, res)=> {
	const {reviewId, movieId} = req.params;

    Review.findById(reviewId)
	.then(review => {
		if (req.session.currentUser._id == review.user) {
			review.remove()
			.then(()=> {
				res.redirect(`/movies/movie-detail/${movieId}`)	
			}).catch(error => console.log(error))
		} 
	}).catch(error => console.log(error))
})

router.post('/movie-detail/:movieId/edit/:reviewId', (req, res)=> {
	const {reviewId, movieId} = req.params;
	const { comment } = req.body;
	
    Review.findById(reviewId)
	.then(review => {
		if (req.session.currentUser._id == review.user) {
			review.comment = comment;
			review.save()
			.then(()=> {
				res.redirect(`/movies/movie-detail/${movieId}`)	
			}).catch(error => console.log(error))
		} 
	}).catch(error => console.log(error))
})

router.get('/:page/:query', (req, res)=> {
	const {query, page} = req.params
	PopcornApi.getMovieBySearch(query, page)
		.then((search) =>{
			console.log(search)
			const foundMovies = search.results;

			PopcornApi.getMovieGenres()
				.then((movieGenres)=>{ 
					const foundGenres = movieGenres.genres;

					const movieWithGenre = foundMovies.map((movie) => {
						movie.genre_ids = movie.genre_ids.map((genreId) => {
							return  foundGenres.find((el) => el.id === genreId).name
						})

						movie.release_date = movie.release_date?.slice(0, 4)

						return movie;
					})
					let nextPage = null
					let previousPage = null

					if(parseInt(page) - 1 >= 1) {
						previousPage = parseInt(page) - 1
					}

					if(parseInt(page) + 1 <= search.total_pages) {
						nextPage = parseInt(page) + 1
					}

					res.render('movies/movie-list', {query, previousPage, nextPage, movies: movieWithGenre, user: req.session.currentUser})
				})
		})
});

router.post('/search/:page', (req, res)=> {
	const {search} = req.body
	const {page} =req.params
	res.redirect(`/movies/${page}/${search}`);
});

module.exports = router;