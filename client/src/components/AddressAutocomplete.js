import React, { useState, useRef, useEffect } from 'react';

const AddressAutocomplete = ({ value, onChange, placeholder = "Adres giriniz...", className = "" }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Google API Key - production'da environment variable'dan alınmalı
  const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;
  
  // Mock veriler (API key yoksa kullanılır)
  const mockSuggestions = [
    "İstanbul, Türkiye",
    "Ankara, Türkiye", 
    "İzmir, Türkiye",
    "Bursa, Türkiye",
    "Antalya, Türkiye",
    "Adana, Türkiye",
    "Gaziantep, Türkiye",
    "Konya, Türkiye",
    "Mersin, Türkiye",
    "Diyarbakır, Türkiye"
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Google Places API ile adres önerilerini getir
  const fetchGooglePlaces = async (input) => {
    if (!GOOGLE_API_KEY) {
      console.log('Google API key bulunamadı, mock veriler kullanılıyor');
      return mockSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(input.toLowerCase())
      );
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=tr&components=country:tr&key=${GOOGLE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Google Places API hatası');
      }
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.predictions.map(prediction => prediction.description);
      } else {
        console.log('Google Places API durumu:', data.status);
        return [];
      }
    } catch (error) {
      console.error('Google Places API hatası:', error);
      // Hata durumunda mock verileri kullan
      return mockSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(input.toLowerCase())
      );
    }
  };

  const handleInputChange = async (e) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (inputValue.length > 2) {
      setIsLoading(true);
      setShowSuggestions(true);
      
      try {
        const results = await fetchGooglePlaces(inputValue);
        setSuggestions(results);
      } catch (error) {
        console.error('Adres önerisi hatası:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length > 2 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center"
            >
              <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-700">{suggestion}</span>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && value.length > 2 && !isLoading && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
        >
          <div className="p-3 text-sm text-gray-500 text-center">
            Adres önerisi bulunamadı
          </div>
        </div>
      )}
      
      {/* API Key durumu göstergesi */}
      {!GOOGLE_API_KEY && (
        <div className="mt-1 text-xs text-amber-600">
          ⚠️ Google API key bulunamadı, sınırlı öneri modu
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete; 