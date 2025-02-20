import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB_1okOZWg5uv_wQzaJH2T4vlNmigreU70",
  authDomain: "movie-streaming-webapp.firebaseapp.com",
  projectId: "movie-streaming-webapp",
  storageBucket: "movie-streaming-webapp.firebasestorage.app",
  messagingSenderId: "436018546152",
  appId: "1:436018546152:web:458cc6f4311992e217505d",
  measurementId: "G-8PC833K8EJ"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

function App() {
  // State Management
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [watchHistory, setWatchHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Load Movies and User Data
  useEffect(() => {
    const moviesRef = ref(database, 'movies');
    onValue(moviesRef, (snapshot) => {
      const data = snapshot.val();
      const movieList = Object.entries(data || {}).map(([id, movie]) => ({
        id,
        ...movie
      }));
      setMovies(movieList);
      setSelectedMovie(movieList[0]);
    });

    auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const historyRef = ref(database, `watchHistory/${currentUser.uid}`);
        onValue(historyRef, (snapshot) => {
          const historyData = snapshot.val() || {};
          setWatchHistory(Object.values(historyData));
          generateRecommendations(movieList, Object.values(historyData));
        });
      }
    });
  }, []);

  // Authentication
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setWatchHistory([]);
    setRecommendations([]);
  };

  // Search Functionality
  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Watch History
  const addToHistory = (movie) => {
    if (user) {
      const historyRef = ref(database, `watchHistory/${user.uid}/${movie.id}`);
      set(historyRef, {
        ...movie,
        timestamp: Date.now()
      });
    }
  };

  // Recommendations Engine
  const generateRecommendations = (allMovies, history) => {
    const genres = history.flatMap(movie => movie.genre.split(', '));
    const genreCount = genres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {});

    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    const recommended = allMovies
      .filter(movie => 
        topGenres.some(genre => movie.genre.includes(genre)) &&
        !history.some(h => h.id === movie.id)
      )
      .slice(0, 5);

    setRecommendations(recommended);
  };

  // Movie Card Component
  const MovieCard = ({ movie }) => (
    <div 
      onClick={() => {
        setSelectedMovie(movie);
        addToHistory(movie);
      }}
      className="group cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-lg transform transition duration-300 group-hover:scale-105">
        <img 
          src={movie.poster} 
          alt={movie.title}
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-4 text-center absolute bottom-0 w-full">
            <h3 className="text-lg font-semibold">{movie.title}</h3>
            <p className="text-sm">{movie.year}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-[#141414]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <span className="flex items-center text-2xl font-bold text-[#e50914]">MovieFlix</span>
            
            <div className="hidden md:flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 px-4 py-2 rounded-md"
              />
              {user ? (
                <div className="flex items-center space-x-4">
                  <span>{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[#e50914]">Logout</button>
                </div>
              ) : (
                <button onClick={handleLogin} className="text-[#e50914]">Login</button>
              )}
            </div>

            <button 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden pb-4">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 px-4 py-2 rounded-md mb-2"
              />
              {user ? (
                <>
                  <span className="block py-2">{user.displayName}</span>
                  <button onClick={handleLogout} className="block py-2 text-[#e50914]">Logout</button>
                </>
              ) : (
                <button onClick={handleLogin} className="block py-2 text-[#e50914]">Login</button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        {/* Featured Movie */}
        {selectedMovie && (
          <div 
            className="relative h-[70vh] bg-cover bg-center" 
            style={{ backgroundImage: `url(${selectedMovie.backdrop})` }}
          >
            <div className="absolute inset-0 bg-black/70">
              <div className="max-w-7xl mx-auto px-4 h-full flex items-center">
                <div className="max-w-2xl">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">{selectedMovie.title}</h1>
                  <p className="text-lg mb-6">{selectedMovie.description}</p>
                  <button 
                    onClick={() => addToHistory(selectedMovie)}
                    className="bg-[#e50914] px-6 py-3 rounded-md hover:bg-red-700"
                  >
                    Watch Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Movie Player */}
        {selectedMovie && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="aspect-video bg-black rounded-lg">
              <video controls className="w-full h-full">
                <source src={selectedMovie.videoUrl} type="video/mp4" />
              </video>
            </div>
          </div>
        )}

        {/* Movie Categories */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* All Movies */}
          <section>
            <h2 className="text-2xl font-bold mb-6">All Movies</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMovies.map(movie => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </section>

          {/* Watch History */}
          {user && watchHistory.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Watch History</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {watchHistory.map(movie => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {user && recommendations.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Recommended For You</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {recommendations.map(movie => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2025 MovieFlix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
