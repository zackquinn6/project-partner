import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  confidence: number;
  highlightedName: string;
  snippet: string;
}

// DIY synonyms mapping for better semantic matching
const DIY_SYNONYMS = {
  'spanner': ['wrench', 'tool'],
  'wrench': ['spanner', 'tool'],
  'fix': ['repair', 'mend', 'restore'],
  'repair': ['fix', 'mend', 'restore'],
  'install': ['mount', 'setup', 'fit'],
  'mount': ['install', 'setup', 'attach'],
  'paint': ['painting', 'decorate', 'color'],
  'painting': ['paint', 'decorating'],
  'floor': ['flooring', 'ground'],
  'flooring': ['floor', 'ground'],
  'tile': ['tiling', 'ceramic', 'porcelain'],
  'kitchen': ['cook', 'culinary'],
  'bathroom': ['bath', 'washroom'],
  'electric': ['electrical', 'wiring'],
  'electrical': ['electric', 'wiring'],
  'plumb': ['plumbing', 'pipes'],
  'plumbing': ['plumb', 'pipes'],
  'landscape': ['landscaping', 'garden', 'yard'],
  'garden': ['landscaping', 'yard', 'outdoor'],
  'deck': ['decking', 'patio', 'outdoor'],
  'fence': ['fencing', 'barrier'],
  'door': ['doors', 'entrance'],
  'window': ['windows', 'glass'],
  'roof': ['roofing', 'ceiling'],
  'wall': ['walls', 'partition'],
  'drywall': ['wallboard', 'sheetrock']
};

export const ProjectSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fetch published projects
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .in('publish_status', ['published', 'beta-testing']);
      
      if (data && !error) {
        setProjects(data);
      }
    };
    
    fetchProjects();
  }, []);

  // Calculate Levenshtein distance for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Calculate similarity score (0-1)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return (maxLength - distance) / maxLength;
  };

  // Get expanded search terms with synonyms
  const getExpandedTerms = (term: string): string[] => {
    const normalizedTerm = term.toLowerCase().trim();
    const terms = [normalizedTerm];
    
    // Add synonyms
    Object.entries(DIY_SYNONYMS).forEach(([key, synonyms]) => {
      if (normalizedTerm.includes(key) || key.includes(normalizedTerm)) {
        terms.push(...synonyms);
      }
    });
    
    // Add plural/singular variants
    if (normalizedTerm.endsWith('s') && normalizedTerm.length > 3) {
      terms.push(normalizedTerm.slice(0, -1)); // Remove 's'
    } else {
      terms.push(normalizedTerm + 's'); // Add 's'
    }
    
    return [...new Set(terms)]; // Remove duplicates
  };

  // Highlight matching terms in text
  const highlightMatches = (text: string, searchTerm: string): string => {
    if (!searchTerm.trim()) return text;
    
    const expandedTerms = getExpandedTerms(searchTerm);
    let highlightedText = text;
    
    expandedTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-primary/20 text-primary font-medium">$1</mark>');
    });
    
    return highlightedText;
  };

  // Create snippet with context around matches
  const createSnippet = (text: string, searchTerm: string, maxLength: number = 120): string => {
    if (!searchTerm.trim()) return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
    
    const expandedTerms = getExpandedTerms(searchTerm);
    let bestMatch = { index: -1, term: '' };
    
    // Find the first matching term
    for (const term of expandedTerms) {
      const index = text.toLowerCase().indexOf(term.toLowerCase());
      if (index !== -1 && (bestMatch.index === -1 || index < bestMatch.index)) {
        bestMatch = { index, term };
      }
    }
    
    if (bestMatch.index === -1) {
      return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    // Create snippet around the match
    const start = Math.max(0, bestMatch.index - 40);
    const end = Math.min(text.length, bestMatch.index + bestMatch.term.length + 40);
    let snippet = text.slice(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  };

  // Perform AI-powered search
  const performSearch = useMemo(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    
    const expandedTerms = getExpandedTerms(searchTerm);
    const results: SearchResult[] = [];
    
    projects.forEach(project => {
      let maxConfidence = 0;
      let bestMatchField = '';
      
      // Search in different fields with different weights
      const searchFields = [
        { field: project.name, weight: 1.0 },
        { field: project.description, weight: 0.8 },
        { field: project.category, weight: 0.6 }
      ];
      
      searchFields.forEach(({ field, weight }) => {
        if (!field) return;
        
        expandedTerms.forEach(term => {
          // Exact match gets highest score
          if (field.toLowerCase().includes(term.toLowerCase())) {
            const similarity = calculateSimilarity(term, field);
            const confidence = similarity * weight * 0.9;
            if (confidence > maxConfidence) {
              maxConfidence = confidence;
              bestMatchField = field;
            }
          }
          
          // Fuzzy match for typo tolerance
          const words = field.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length >= 3 && term.length >= 3) {
              const similarity = calculateSimilarity(term, word);
              if (similarity > 0.6) { // Threshold for fuzzy match
                const confidence = similarity * weight * 0.7;
                if (confidence > maxConfidence) {
                  maxConfidence = confidence;
                  bestMatchField = field;
                }
              }
            }
          });
        });
      });
      
      // If confidence is above threshold, add to results
      if (maxConfidence > 0.3) {
        results.push({
          id: project.id,
          name: project.name,
          description: project.description || '',
          category: project.category || '',
          difficulty: project.difficulty || '',
          confidence: maxConfidence,
          highlightedName: highlightMatches(project.name, searchTerm),
          snippet: createSnippet(project.description || project.name, searchTerm)
        });
      }
    });
    
    // Sort by confidence score (highest first)
    results.sort((a, b) => b.confidence - a.confidence);
    
    setSearchResults(results);
    setShowResults(results.length > 0);
    setIsSearching(false);
  }, [searchTerm, projects]);

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    // Navigate to projects page with search term
    navigate(`/projects?search=${encodeURIComponent(searchTerm)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getBestResult = () => {
    if (searchResults.length === 0) return null;
    const bestResult = searchResults[0];
    return bestResult.confidence > 0.8 ? bestResult : null;
  };

  const bestResult = getBestResult();
  const shouldShowTopResults = searchResults.length > 0 && !bestResult;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="What's your next project?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-12 pr-12 py-4 text-lg border-primary/20 focus:border-primary bg-background/80 backdrop-blur-sm"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
          )}
        </div>
        
        {/* Search Results Dropdown */}
        {showResults && (searchResults.length > 0) && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 border-primary/20 shadow-elegant max-h-80 overflow-y-auto">
            <CardContent className="p-0">
              {bestResult ? (
                // Show single best match
                <div className="p-4 border-b border-primary/10 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 
                          className="font-semibold text-sm"
                          dangerouslySetInnerHTML={{ __html: bestResult.highlightedName }}
                        />
                        <Badge variant="outline" className="text-xs">
                          {Math.round(bestResult.confidence * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {bestResult.snippet}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {bestResult.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {bestResult.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Show top 5 results
                searchResults.slice(0, 5).map((result) => (
                  <div key={result.id} className="p-3 border-b border-primary/10 last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 
                            className="font-medium text-sm"
                            dangerouslySetInnerHTML={{ __html: result.highlightedName }}
                          />
                          <Badge variant="outline" className="text-xs">
                            {Math.round(result.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                          {result.snippet}
                        </p>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {result.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Show All Results Button */}
              <div className="p-3 border-t border-primary/10">
                <Button 
                  onClick={handleSearch} 
                  className="w-full text-sm"
                  variant="ghost"
                >
                  See all {searchResults.length} results
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Search Button */}
      <div className="mt-4 text-center">
        <Button 
          onClick={handleSearch} 
          size="lg"
          className="px-8"
          disabled={!searchTerm.trim()}
        >
          Search Projects
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};